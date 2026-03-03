import { NextResponse } from "next/server";
import { createClient as createUserClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

function isAdminEmail(email: string | null | undefined) {
  const list = (process.env.PMS_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return !!email && list.includes(email.toLowerCase());
}

export async function GET() {
  // Verify current user is admin (session-based)
  const supabaseUser = await createUserClient();
  const { data } = await supabaseUser.auth.getUser();
  const user = data?.user;

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Service role can read everything
  const supabase = createServiceClient();

  const { data: rows, error } = await supabase
    .from("memberships")
    .select("id,user_id,group_key,status,created_at,profiles(email,full_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ pending: rows ?? [] });
}

export async function POST(req: Request) {
  // Verify current user is admin
  const supabaseUser = await createUserClient();
  const { data } = await supabaseUser.auth.getUser();
  const user = data?.user;

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const membershipId = body?.membershipId as string | undefined;
  const status = body?.status as "approved" | "rejected" | undefined;

  if (!membershipId || !status || !["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("memberships")
    .update({ status })
    .eq("id", membershipId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
