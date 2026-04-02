import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type GroupKey = "doostaneh" | "sunday" | "friday";

export async function POST(req: Request) {
  const supabase = await createClient();
  const service = createServiceClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  const fullName = String(body?.fullName || "").trim();
  const email = String(user.email || "").trim().toLowerCase();
  const groups = Array.isArray(body?.groups) ? body.groups : [];

  if (!email || groups.length === 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const cleanGroups = Array.from(
    new Set(
      groups.filter(
        (g: string): g is GroupKey =>
          g === "doostaneh" || g === "sunday" || g === "friday"
      )
    )
  );

  if (cleanGroups.length === 0) {
    return NextResponse.json({ error: "No valid groups supplied" }, { status: 400 });
  }

  const { error: profileError } = await service
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email,
        full_name: fullName || null,
      },
      { onConflict: "id" }
    );

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  const rows = cleanGroups.map((group_key) => ({
    user_id: user.id,
    group_key,
    status: "pending",
  }));

  const { error: membershipError } = await service
    .from("memberships")
    .upsert(rows, { onConflict: "user_id,group_key" });

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}