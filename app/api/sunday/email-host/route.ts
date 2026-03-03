import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();

  // 1) Auth
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user;

  if (userErr || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 2) Must be Sunday admin/master
  const { data: adminRow } = await supabase
    .from("admins")
    .select("role")
    .eq("user_id", user.id)
    .eq("group_key", "sunday")
    .maybeSingle();

  if (!adminRow?.role) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // 3) Body
  const body = await req.json().catch(() => ({}));
  const event_id = body?.event_id as string | undefined;

  if (!event_id) {
    return NextResponse.json({ error: "Missing event_id" }, { status: 400 });
  }

  // 4) Load event
  const { data: eventRow, error: eventErr } = await supabase
    .from("events")
    .select("id,title,event_date,host_user_id,group_id")
    .eq("id", event_id)
    .single();

  if (eventErr || !eventRow) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Ensure group slug is sunday
  const { data: groupRow } = await supabase
    .from("groups")
    .select("slug")
    .eq("id", eventRow.group_id)
    .single();

  if (!groupRow || groupRow.slug !== "sunday") {
    return NextResponse.json(
      { error: "Event is not a Sunday event" },
      { status: 400 }
    );
  }

  if (!eventRow.host_user_id) {
    return NextResponse.json(
      { error: "Host not set for event" },
      { status: 400 }
    );
  }

  // 5) Host profile
  const { data: hostProfile } = await supabase
    .from("profiles")
    .select("full_name,email")
    .eq("id", eventRow.host_user_id)
    .maybeSingle();

  const hostEmail = hostProfile?.email;

  if (!hostEmail) {
    return NextResponse.json(
      { error: "Host email not found" },
      { status: 400 }
    );
  }

  // 6) Get GOING RSVPs
  const { data: goingRsvps } = await supabase
    .from("rsvps")
    .select("user_id")
    .eq("event_id", event_id)
    .eq("status", "going");

  const userIds = (goingRsvps || []).map((r) => r.user_id);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id,full_name,email")
    .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

  const map = new Map<string, { full_name: string | null; email: string | null }>();
  (profiles || []).forEach((p: any) =>
    map.set(p.id, { full_name: p.full_name, email: p.email })
  );

  const lines = userIds.map((id, i) => {
    const p = map.get(id);
    const name = p?.full_name || p?.email || id;
    return `${i + 1}. ${name}`;
  });

  const title = eventRow.title;
  const when = new Date(eventRow.event_date).toLocaleString();

  const subject = `Sunday Poker Host List — ${title} (${when})`;
  const bodyText =
    `Event: ${title}\n` +
    `When: ${when}\n` +
    `Attending (GOING): ${lines.length}\n\n` +
    (lines.length ? lines.join("\n") : "No one marked GOING yet.");

  const mailto =
    `mailto:${encodeURIComponent(hostEmail)}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(bodyText)}`;

  return NextResponse.json({
    ok: true,
    to: hostEmail,
    subject,
    body: bodyText,
    mailto,
  });
}