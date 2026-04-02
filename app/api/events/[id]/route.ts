import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const serviceSupabase = createServiceClient();

  // Fetch event to get group_id
  const { data: eventRow } = await serviceSupabase
    .from("events")
    .select("id, group_id")
    .eq("id", eventId)
    .maybeSingle();

  if (!eventRow) {
    return NextResponse.json({ ok: false, error: "Event not found" }, { status: 404 });
  }

  // Get group slug
  const { data: groupRow } = await serviceSupabase
    .from("groups")
    .select("slug")
    .eq("id", eventRow.group_id)
    .maybeSingle();

  if (!groupRow) {
    return NextResponse.json({ ok: false, error: "Group not found" }, { status: 404 });
  }

  // Verify caller is admin for this group
  const { data: adminRow } = await serviceSupabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .eq("group_key", groupRow.slug)
    .maybeSingle();

  if (!adminRow) {
    return NextResponse.json({ ok: false, error: "Not authorized" }, { status: 403 });
  }

  // Delete RSVPs first, then the event
  await serviceSupabase.from("rsvps").delete().eq("event_id", eventId);

  const { error } = await serviceSupabase.from("events").delete().eq("id", eventId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const notes = body?.notes !== undefined ? body.notes : undefined;

  if (notes === undefined) {
    return NextResponse.json({ ok: false, error: "Missing notes field" }, { status: 400 });
  }

  const serviceSupabase = createServiceClient();

  // Fetch event
  const { data: eventRow } = await serviceSupabase
    .from("events")
    .select("id, host_user_id, group_id")
    .eq("id", eventId)
    .maybeSingle();

  if (!eventRow) {
    return NextResponse.json({ ok: false, error: "Event not found" }, { status: 404 });
  }

  // Verify caller is the host or an admin
  const isHost = eventRow.host_user_id === userData.user.id;

  if (!isHost) {
    const { data: groupRow } = await serviceSupabase
      .from("groups")
      .select("slug")
      .eq("id", eventRow.group_id)
      .maybeSingle();

    const { data: adminRow } = groupRow
      ? await serviceSupabase
          .from("admins")
          .select("user_id")
          .eq("user_id", userData.user.id)
          .eq("group_key", groupRow.slug)
          .maybeSingle()
      : { data: null };

    if (!adminRow) {
      return NextResponse.json({ ok: false, error: "Not authorized" }, { status: 403 });
    }
  }

  const { error } = await serviceSupabase
    .from("events")
    .update({ notes: notes ?? null })
    .eq("id", eventId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
