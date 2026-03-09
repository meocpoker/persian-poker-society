import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request, ctx: any) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }

  const params = await ctx.params;
  const sessionId = params?.sessionId as string;

  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "missing_session_id" }, { status: 400 });
  }

  const { data: session, error: sErr } = await supabase
    .from("sessions")
    .select("id, group_key, format, starts_at, status, tournament_number, charity_usd, doostaneh_winner_count")
    .eq("id", sessionId)
    .single();

  if (sErr) return NextResponse.json({ ok: false, error: sErr.message }, { status: 400 });

  const { data: players, error: pErr } = await supabase
    .from("session_registry_players")
    .select("player_id, finish_place, player_registry:player_registry(id, full_name, email)")
    .eq("session_id", sessionId);

  if (pErr) return NextResponse.json({ ok: false, error: pErr.message }, { status: 400 });

  const { data: entries, error: eErr } = await supabase
    .from("player_entries")
    .select("id, session_id, registry_player_id, type, amount_usd, created_at")
    .eq("session_id", sessionId);

  if (eErr) return NextResponse.json({ ok: false, error: eErr.message }, { status: 400 });

  return NextResponse.json({ ok: true, session, players, entries });
}