import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

type GroupKey = "doostaneh" | "sunday" | "friday";

export async function POST(req: Request) {
  const supabase = createServiceClient();

  const body = await req.json().catch(() => null);

  const userId = String(body?.userId || "");
  const fullName = String(body?.fullName || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  const groups = Array.isArray(body?.groups) ? body.groups : [];

  if (!userId || !fullName || !email || groups.length === 0) {
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

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        email,
        full_name: fullName,
      },
      { onConflict: "id" }
    );

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  const insertRows = cleanGroups.map((group_key) => ({
    user_id: userId,
    group_key,
    status: "pending",
  }));

  const { error: insertError } = await supabase
    .from("memberships")
    .insert(insertRows);

  if (insertError) {
    const msg = String(insertError.message || "").toLowerCase();
    const isDuplicate = msg.includes("duplicate key") || msg.includes("23505");

    if (!isDuplicate) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    for (const group_key of cleanGroups) {
      const { error: updateError } = await supabase
        .from("memberships")
        .update({ status: "pending" })
        .eq("user_id", userId)
        .eq("group_key", group_key);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}