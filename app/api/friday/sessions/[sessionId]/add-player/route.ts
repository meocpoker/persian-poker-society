import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ sessionId: string }> | { sessionId: string } }
) {
  const supabase = createServiceClient();

  const resolvedParams = await Promise.resolve(ctx.params);
  const sessionId = resolvedParams?.sessionId;

  const body = await req.json().catch(() => null);
  const playerId = body?.player_id as string | undefined;

  if (!sessionId || !playerId) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const { data: existing, error: existingError } = await supabase
    .from("session_registry_players")
    .select("player_id")
    .eq("session_id", sessionId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (!existing) {
    const { error: insertError } = await supabase
      .from("session_registry_players")
      .insert({
        session_id: sessionId,
        player_id: playerId,
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}