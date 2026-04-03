import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }

  const serviceSupabase = createServiceClient();

  const { data } = await serviceSupabase
    .from("sessions")
    .select("tournament_number")
    .eq("group_key", "doostaneh")
    .order("tournament_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const suggested = data?.tournament_number != null ? Number(data.tournament_number) + 1 : 1;

  return NextResponse.json({ ok: true, suggested });
}

export async function POST(req: Request) {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const startsAt = body?.starts_at;
  if (!startsAt) {
    return NextResponse.json({ ok: false, error: "missing_starts_at" }, { status: 400 });
  }

  const gameNumber = String(body?.game_number ?? "").trim() || null;

  const { data, error } = await supabase.rpc("admin_open_doostaneh_tournament", {
    p_starts_at: startsAt,
    p_assign_number: false,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  const sessionId = data as string;

  if (gameNumber) {
    const serviceSupabase = createServiceClient();
    await serviceSupabase
      .from("sessions")
      .update({ external_game_id: gameNumber })
      .eq("id", sessionId);
  }

  return NextResponse.json({ ok: true, session_id: sessionId });
}
