import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request, ctx: any) {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }

  const params = await ctx.params;
  const sessionId = params?.sessionId as string;

  const body = await req.json().catch(() => ({}));
  const playerId = body?.player_id as string;

  if (!sessionId || !playerId) {
    return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });
  }

  const { error } = await supabase
    .from("session_registry_players")
    .insert({
      session_id: sessionId,
      player_id: playerId,
      created_by: userData.user.id,
    });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}