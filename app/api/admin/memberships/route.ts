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

  return NextResponse.json({ ok: true });
}