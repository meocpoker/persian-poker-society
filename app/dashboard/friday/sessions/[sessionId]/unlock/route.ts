import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getSessionIdFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  const idx = parts.findIndex((p) => p === "sessions");
  if (idx === -1) return null;
  return parts[idx + 1] ?? null;
}

export async function POST(req: Request, ctx: any) {
  const params = await Promise.resolve(ctx?.params);
  const supabase = await createClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const sessionId =
    params?.sessionId ??
    params?.sessionID ??
    getSessionIdFromPath(url.pathname);

  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json(
      { ok: false, error: `Missing sessionId (got: ${String(sessionId)})` },
      { status: 400 }
    );
  }

  const { error: unlockErr } = await supabase.rpc("admin_unlock_session", {
    p_session_id: sessionId,
  });

  if (unlockErr) {
    return NextResponse.json({ ok: false, error: unlockErr.message }, { status: 400 });
  }

  return NextResponse.redirect(new URL(`/dashboard/friday/sessions/${sessionId}`, req.url));
}