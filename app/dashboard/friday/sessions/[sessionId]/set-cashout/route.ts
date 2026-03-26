import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request, ctx: any) {
  const supabase = await createClient();

  const params = await ctx.params;
  const sessionId = params?.sessionId as string;

  const body = await req.json();
  const playerId = body.player_id;
  const amount = Number(body.amount);

  await supabase
    .from("player_entries")
    .delete()
    .eq("session_id", sessionId)
    .eq("registry_player_id", playerId)
    .eq("type", "cashout");

  const { error } = await supabase.from("player_entries").insert({
    session_id: sessionId,
    registry_player_id: playerId,
    type: "cashout",
    amount_usd: amount,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message });
  }

  return NextResponse.json({ ok: true });
}