import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("player_registry_groups")
    .select("player_id, player_registry:player_registry(id, full_name, email, pokerstars_username)")
    .eq("group_key", "doostaneh")
    .order("player_id", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  const players = (data ?? [])
    .map((r: any) => r.player_registry)
    .filter(Boolean)
    .sort((a: any, b: any) => String(a.full_name ?? "").localeCompare(String(b.full_name ?? "")));

  return NextResponse.json({ ok: true, players });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const serviceSupabase = createServiceClient();

  // Verify caller is a Doostaneh admin
  const { data: adminRow } = await serviceSupabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .eq("group_key", "doostaneh")
    .maybeSingle();

  if (!adminRow) {
    return NextResponse.json({ ok: false, error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const player_id = String(body?.player_id || "").trim();
  const pokerstars_username = body?.pokerstars_username !== undefined
    ? String(body.pokerstars_username).trim() || null
    : undefined;

  if (!player_id) {
    return NextResponse.json({ ok: false, error: "Missing player_id" }, { status: 400 });
  }

  if (pokerstars_username === undefined) {
    return NextResponse.json({ ok: false, error: "Missing pokerstars_username" }, { status: 400 });
  }

  const { error } = await serviceSupabase
    .from("player_registry")
    .update({ pokerstars_username })
    .eq("id", player_id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
