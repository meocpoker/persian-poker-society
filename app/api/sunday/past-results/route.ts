import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: Request) {
  const supabase = await createClient();
  const serviceSupabase = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? "", 10);
  const month = parseInt(searchParams.get("month") ?? "", 10);

  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid year or month" }, { status: 400 });
  }

  const startDate = `${year}-${String(month).padStart(2, "0")}-01T00:00:00Z`;
  const endYear = month === 12 ? year + 1 : year;
  const endMonth = month === 12 ? 1 : month + 1;
  const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01T00:00:00Z`;

  const { data: sessions, error: sessionsErr } = await serviceSupabase
    .from("sessions")
    .select("id")
    .eq("group_key", "sunday")
    .gte("starts_at", startDate)
    .lt("starts_at", endDate);

  if (sessionsErr) return NextResponse.json({ error: sessionsErr.message }, { status: 400 });

  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ ok: true, rows: [] });
  }

  const sessionIds = sessions.map((s: any) => s.id);

  const { data: entries, error: entriesErr } = await serviceSupabase
    .from("player_entries")
    .select("registry_player_id, type, amount_usd")
    .in("session_id", sessionIds)
    .in("type", ["buyin", "cashout"]);

  if (entriesErr) return NextResponse.json({ error: entriesErr.message }, { status: 400 });

  if (!entries || entries.length === 0) {
    return NextResponse.json({ ok: true, rows: [] });
  }

  const agg = new Map<string, { buyin: number; cashout: number }>();
  for (const e of entries as any[]) {
    if (!agg.has(e.registry_player_id)) {
      agg.set(e.registry_player_id, { buyin: 0, cashout: 0 });
    }
    const cur = agg.get(e.registry_player_id)!;
    if (e.type === "buyin") cur.buyin += Number(e.amount_usd || 0);
    if (e.type === "cashout") cur.cashout += Number(e.amount_usd || 0);
  }

  const { data: players, error: playersErr } = await serviceSupabase
    .from("player_registry")
    .select("id, full_name, email")
    .in("id", [...agg.keys()]);

  if (playersErr) return NextResponse.json({ error: playersErr.message }, { status: 400 });

  const playersById = new Map(
    (players ?? []).map((p: any) => [p.id as string, (p.full_name || p.email || "Unknown") as string])
  );

  const rows = [...agg.entries()]
    .map(([registryId, { buyin, cashout }]) => ({
      name: playersById.get(registryId) ?? "Unknown",
      buyin,
      cashout,
      net: cashout - buyin,
    }))
    .sort((a, b) => b.net - a.net);

  return NextResponse.json({ ok: true, rows });
}
