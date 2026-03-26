import { NextResponse } from "next/server";
import { createClient as createUserClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function getAdminGroups(userId: string) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("admins")
    .select("group_key")
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((row) => row.group_key)
    .filter(Boolean) as string[];
}

async function ensureRegistryMembership(
  supabase: ReturnType<typeof createServiceClient>,
  membershipId: string,
  actorUserId: string
) {
  const { data: membershipRow, error: membershipRowError } = await supabase
    .from("memberships")
    .select("id, user_id, group_key, profiles(full_name,email)")
    .eq("id", membershipId)
    .maybeSingle();

  if (membershipRowError) {
    throw new Error(membershipRowError.message);
  }

  if (!membershipRow?.user_id || !membershipRow?.group_key) {
    return;
  }

  const profile = Array.isArray((membershipRow as any).profiles)
    ? (membershipRow as any).profiles[0]
    : (membershipRow as any).profiles;

  const email = String(profile?.email ?? "").trim().toLowerCase();
  const fullName =
    String(profile?.full_name ?? "").trim() ||
    email ||
    `Member ${String(membershipRow.user_id).slice(0, 8)}`;

  if (!email) {
    throw new Error("Approved membership is missing profile email.");
  }

  const { data: registryRow, error: registryError } = await supabase
    .from("player_registry")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (registryError) {
    throw new Error(registryError.message);
  }

  let playerId = registryRow?.id as string | undefined;

  if (!playerId) {
    const { data: insertedRegistry, error: insertRegistryError } = await supabase
      .from("player_registry")
      .insert({
        full_name: fullName,
        email,
        created_by: actorUserId,
      })
      .select("id")
      .single();

    if (insertRegistryError) {
      throw new Error(insertRegistryError.message);
    }

    playerId = insertedRegistry.id;
  } else {
    const { error: updateRegistryError } = await supabase
      .from("player_registry")
      .update({
        full_name: fullName,
        email,
      })
      .eq("id", playerId);

    if (updateRegistryError) {
      throw new Error(updateRegistryError.message);
    }
  }

  const { data: existingGroupRow, error: existingGroupError } = await supabase
    .from("player_registry_groups")
    .select("id")
    .eq("player_id", playerId)
    .eq("group_key", membershipRow.group_key)
    .maybeSingle();

  if (existingGroupError) {
    throw new Error(existingGroupError.message);
  }

  if (!existingGroupRow) {
    const { error: insertGroupError } = await supabase
      .from("player_registry_groups")
      .insert({
        player_id: playerId,
        group_key: membershipRow.group_key,
        created_by: actorUserId,
      });

    if (insertGroupError) {
      throw new Error(insertGroupError.message);
    }
  }
}

export async function GET() {
  const supabaseUser = await createUserClient();
  const { data } = await supabaseUser.auth.getUser();
  const user = data?.user;

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminGroups = await getAdminGroups(user.id);

  if (adminGroups.length === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createServiceClient();

  const { data: rows, error } = await supabase
    .from("memberships")
    .select("id,user_id,group_key,status,created_at,profiles(email,full_name)")
    .eq("status", "pending")
    .in("group_key", adminGroups)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ pending: rows ?? [] });
}

export async function POST(req: Request) {
  const supabaseUser = await createUserClient();
  const { data } = await supabaseUser.auth.getUser();
  const user = data?.user;

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const membershipId = body?.membershipId as string | undefined;
  const status = body?.status as "approved" | "rejected" | undefined;

  if (!membershipId || !status || !["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const adminGroups = await getAdminGroups(user.id);

  if (adminGroups.length === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createServiceClient();

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("id,group_key")
    .eq("id", membershipId)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }

  if (!membership) {
    return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  }

  if (!adminGroups.includes(membership.group_key)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("memberships")
    .update({ status })
    .eq("id", membershipId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (status === "approved") {
    try {
      await ensureRegistryMembership(supabase, membershipId, user.id);
    } catch (e: any) {
      return NextResponse.json(
        { error: e?.message || "Approved, but failed to create player registry link." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}