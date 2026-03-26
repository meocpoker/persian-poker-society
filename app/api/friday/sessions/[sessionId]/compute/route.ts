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
    return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
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

  const { data: lifecycle, error: lifeErr } = await supabase
    .rpc("admin_session_lifecycle", { p_session_id: sessionId })
    .maybeSingle();

  if (lifeErr) {
    return NextResponse.json({ ok: false, error: lifeErr.message }, { status: 400 });
  }

  if (!(lifecycle as any)?.can_compute) {
    return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 });
  }

  const { error: computeErr } = await supabase.rpc("admin_compute_payout", {
    p_session_id: sessionId,
  });

  if (computeErr) {
    return NextResponse.json({ ok: false, error: computeErr.message }, { status: 400 });
  }

  const dest = new URL(`/dashboard/friday/sessions/${sessionId}`, req.url);
  const res = NextResponse.redirect(dest, { status: 303 });
  res.headers.set("Cache-Control", "no-store");
  return res;
}