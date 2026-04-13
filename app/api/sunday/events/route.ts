import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// ── Shared admin check ──────────────────────────────────────────────────────
async function checkSundayAdmin(userId: string): Promise<boolean> {
  const serviceSupabase = createServiceClient();
  const { data: adminRows } = await serviceSupabase
    .from("admins")
    .select("group_key, role")
    .eq("user_id", userId);

  const isMaster = (adminRows ?? []).some((r: any) => r.role === "master");
  const hasSundayAdmin = (adminRows ?? []).some((r: any) => r.group_key === "sunday");
  return isMaster || hasSundayAdmin;
}

// ── POST: Create Sunday event + cash session ─────────────────────────────────
export async function POST(req: Request) {
  const supabase = await createClient();
  const serviceSupabase = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (!(await checkSundayAdmin(user.id))) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { date, host_user_id, host_address, host_phone } = body;

  if (!date) return NextResponse.json({ error: "Missing date" }, { status: 400 });

  const { data: group } = await serviceSupabase
    .from("groups")
    .select("id")
    .eq("slug", "sunday")
    .maybeSingle();

  if (!group) return NextResponse.json({ error: "Sunday group not found" }, { status: 400 });

  // Store as noon ET = 17:00 UTC
  const eventDate = `${date}T17:00:00Z`;
  const title = `Sunday Poker - ${date}`;

  const { data: event, error: eventErr } = await serviceSupabase
    .from("events")
    .insert({
      group_id: group.id,
      title,
      event_date: eventDate,
      status: "active",
      host_user_id: host_user_id || null,
      host_address: host_address || null,
      host_phone: host_phone || null,
    })
    .select("id")
    .single();

  if (eventErr) return NextResponse.json({ error: eventErr.message }, { status: 400 });

  const { data: session, error: sessionErr } = await serviceSupabase
    .from("sessions")
    .insert({
      group_key: "sunday",
      format: "cash",
      starts_at: eventDate,
      created_by: user.id,
      status: "active",
    })
    .select("id")
    .single();

  if (sessionErr) return NextResponse.json({ error: sessionErr.message }, { status: 400 });

  return NextResponse.json({ ok: true, event_id: event.id, session_id: session.id });
}

// ── PATCH: Validate → Compute payout → Close event ──────────────────────────
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const serviceSupabase = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (!(await checkSundayAdmin(user.id))) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { event_id } = body;

  if (!event_id) return NextResponse.json({ error: "Missing event_id" }, { status: 400 });

  // Fetch event
  const { data: event } = await serviceSupabase
    .from("events")
    .select("id, event_date")
    .eq("id", event_id)
    .maybeSingle();

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  // Find matching session by group_key + starts_at
  const { data: session } = await serviceSupabase
    .from("sessions")
    .select("id")
    .eq("group_key", "sunday")
    .eq("starts_at", event.event_date)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: "No session found for this event" }, { status: 404 });
  }

  // Step 1: going RSVPs → user_ids
  const { data: goingRsvps } = await serviceSupabase
    .from("rsvps")
    .select("user_id")
    .eq("event_id", event_id)
    .eq("status", "going");

  const goingUserIds = (goingRsvps ?? []).map((r: any) => r.user_id as string);

  if (goingUserIds.length === 0) {
    return NextResponse.json({ error: "No going RSVPs for this event" }, { status: 400 });
  }

  // Step 2: user_ids → profiles → emails
  const { data: profileRows } = await serviceSupabase
    .from("profiles")
    .select("id, email, full_name")
    .in("id", goingUserIds);

  const profileByUserId = new Map(
    (profileRows ?? []).map((p: any) => [
      p.id,
      { email: p.email as string, name: (p.full_name || p.email || "Unknown") as string },
    ])
  );

  const goingEmails = [...profileByUserId.values()].map((p) => p.email).filter(Boolean);

  // Step 3: emails → player_registry → registry ids
  const { data: registryRows } = goingEmails.length
    ? await serviceSupabase
        .from("player_registry")
        .select("id, email, full_name")
        .in("email", goingEmails)
    : { data: [] as any[] };

  const registryByEmail = new Map(
    (registryRows ?? []).map((r: any) => [
      r.email as string,
      { id: r.id as string, name: (r.full_name || r.email || "Unknown") as string },
    ])
  );

  // Step 4: player_entries for this session — buyin and cashout flags
  const { data: entries } = await serviceSupabase
    .from("player_entries")
    .select("registry_player_id, type")
    .eq("session_id", session.id)
    .in("type", ["buyin", "cashout"]);

  const entryFlags = new Map<string, { hasBuyin: boolean; hasCashout: boolean }>();
  for (const e of (entries ?? []) as any[]) {
    if (!entryFlags.has(e.registry_player_id)) {
      entryFlags.set(e.registry_player_id, { hasBuyin: false, hasCashout: false });
    }
    const cur = entryFlags.get(e.registry_player_id)!;
    if (e.type === "buyin") cur.hasBuyin = true;
    if (e.type === "cashout") cur.hasCashout = true;
  }

  // Step 5: validate each going RSVP player through the email chain
  const missing: { name: string; missing: string }[] = [];

  for (const userId of goingUserIds) {
    const profile = profileByUserId.get(userId);
    if (!profile?.email) continue;

    const regEntry = registryByEmail.get(profile.email);
    const displayName = regEntry?.name ?? profile.name;

    if (!regEntry) {
      missing.push({ name: displayName, missing: "buy-in and cashout (not in player registry)" });
      continue;
    }

    const flags = entryFlags.get(regEntry.id);
    if (!flags || (!flags.hasBuyin && !flags.hasCashout)) {
      missing.push({ name: displayName, missing: "buy-in and cashout" });
    } else if (!flags.hasBuyin) {
      missing.push({ name: displayName, missing: "buy-in" });
    } else if (!flags.hasCashout) {
      missing.push({ name: displayName, missing: "cashout" });
    }
  }

  if (missing.length > 0) {
    return NextResponse.json({ ok: false, missing });
  }

  // All valid — call compute RPC
  const { error: rpcErr } = await serviceSupabase.rpc("admin_compute_payout", {
    p_session_id: session.id,
  });

  if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 400 });

  // Close the event
  const { error: updateErr } = await serviceSupabase
    .from("events")
    .update({ status: "closed" })
    .eq("id", event_id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
