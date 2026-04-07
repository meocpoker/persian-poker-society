import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: Request) {
  const supabase = createServiceClient();

  const body = await req.json().catch(() => ({}));
  const userId = String(body?.user_id || "").trim();
  const eventDate = String(body?.event_date || "").slice(0, 10);

  if (!userId) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }

  if (!eventDate) {
    return NextResponse.json({ error: "Missing event_date" }, { status: 400 });
  }

  const { data: adminRows, error: adminErr } = await supabase
    .from("admins")
    .select("user_id, group_key, role")
    .eq("user_id", userId);

  if (adminErr) {
    return NextResponse.json({ error: adminErr.message }, { status: 400 });
  }

  const isMaster = (adminRows ?? []).some((r: any) => r.role === "master");
  const hasFridayAdmin = (adminRows ?? []).some((r: any) => r.group_key === "friday");

  if (!isMaster && !hasFridayAdmin) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const { data: group, error: groupErr } = await supabase
    .from("groups")
    .select("id")
    .eq("slug", "friday")
    .maybeSingle();

  if (groupErr) {
    return NextResponse.json({ error: groupErr.message }, { status: 400 });
  }

  if (!group?.id) {
    return NextResponse.json({ error: "Friday group not found" }, { status: 400 });
  }

  const title = `Friday Poker - ${eventDate}`;
  const eventDateTimestamp = `${eventDate}T23:00:00Z`;

  const { error: insertErr } = await supabase.from("events").insert({
    group_id: group.id,
    title,
    event_date: eventDateTimestamp,
    status: "draft",
    host_user_id: null,
    buy_in_amount: 100,
  });

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}