import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const serviceSupabase = createServiceClient();

  // Fetch session
  const { data: sessionRow } = await serviceSupabase
    .from("sessions")
    .select("id, status, group_key")
    .eq("id", sessionId)
    .eq("group_key", "doostaneh")
    .maybeSingle();

  if (!sessionRow) {
    return NextResponse.json({ ok: false, error: "Session not found" }, { status: 404 });
  }

  if (!["open", "active", "locked"].includes(sessionRow.status)) {
    return NextResponse.json(
      { ok: false, error: "Only open, active, or locked sessions can be deleted." },
      { status: 403 }
    );
  }

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

  // Delete related data then the session
  await serviceSupabase.from("player_entries").delete().eq("session_id", sessionId);
  await serviceSupabase.from("session_registry_players").delete().eq("session_id", sessionId);

  const { error } = await serviceSupabase.from("sessions").delete().eq("id", sessionId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
