import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const { data, error } = await supabase.rpc("admin_open_doostaneh_tournament", {
    p_starts_at: startsAt,
    p_assign_number: false,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, session_id: data });
}