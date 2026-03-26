import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ sessionId: string }> | { sessionId: { sessionId: string } } }
) {
  const supabase = createServiceClient();

  const resolvedParams = await Promise.resolve(ctx.params as any);
  const sessionId = resolvedParams?.sessionId;

  const body = await req.json().catch(() => null);
  const playerId = body?.player_id;
  const amount = Number(body?.amount ?? 0);

  if (!sessionId || !playerId) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("player_entries")
    .select("id")
    .eq("session_id", sessionId)
    .eq("registry_player_id", playerId)
    .eq("type", "buyin")
    .maybeSingle();

  if (existing) {
    await supabase
      .from("player_entries")
      .update({ amount_usd: amount })
      .eq("id", existing.id);
  } else {
    await supabase.from("player_entries").insert({
      session_id: sessionId,
      registry_player_id: playerId,
      type: "buyin",
      amount_usd: amount,
    });
  }

  return NextResponse.json({ ok: true });
}