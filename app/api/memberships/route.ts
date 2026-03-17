import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user;

  if (userErr || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // ✅ ONLY APPROVED memberships
  const { data, error } = await supabase
    .from("memberships")
    .select("group_key,status")
    .eq("user_id", user.id)
    .eq("status", "approved"); // 🔥 critical fix

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // safety: unique groups only
  const unique = Array.from(
    new Set((data ?? []).map((m: any) => m.group_key))
  ).map((g) => ({ group_key: g, status: "approved" }));

  return NextResponse.json({ memberships: unique });
}