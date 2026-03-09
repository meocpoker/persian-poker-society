import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("player_registry_groups")
    .select("player_id, player_registry:player_registry(id, full_name, email)")
    .eq("group_key", "doostaneh")
    .order("player_id", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  const players = (data ?? [])
    .map((r: any) => r.player_registry)
    .filter(Boolean)
    .sort((a: any, b: any) => String(a.full_name ?? "").localeCompare(String(b.full_name ?? "")));

  return NextResponse.json({ ok: true, players });
}