import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getSessionIdFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  const idx = parts.findIndex((p) => p === "sessions");
  if (idx === -1) return null;
  return parts[idx + 1] ?? null;
}

export async function POST(req: Request, ctx: any) {
  const supabase = await createClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user;

  if (userErr || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const sessionId =
    ctx?.params?.sessionId ??
    ctx?.params?.sessionID ??
    getSessionIdFromPath(url.pathname);

  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json(
      { ok: false, error: `Missing sessionId (got: ${String(sessionId)})` },
      { status: 400 }
    );
  }

  // 🔒 Enforce lifecycle rules before computing
  const { data: lifecycle, error: lifeErr } = await supabase
    .rpc("admin_session_lifecycle", { p_session_id: sessionId })
    .maybeSingle();

  if (lifeErr) {
    return NextResponse.json({ ok: false, error: lifeErr.message }, { status: 400 });
  }

  if (!(lifecycle as any)?.can_compute) {
    return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 });
  }

  // ✅ Mark session computed (this is what flips already_computed)
  const { error: updateError } = await supabase
    .from("sessions")
    .update({
      computed_at: new Date().toISOString(),
      status: "computed",
    })
    .eq("id", sessionId);

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 400 });
  }

  // 🧾 Log compute action (best-effort)
  await supabase.from("admin_action_log").insert({
    session_id: sessionId,
    action: "compute_payout",
    status: "ok",
  });

  return NextResponse.json({ ok: true });
}