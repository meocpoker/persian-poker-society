import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user;

  if (userErr || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: adminRow } = await supabase
    .from("admins")
    .select("role")
    .eq("user_id", user.id)
    .eq("group_key", "sunday")
    .maybeSingle();

  if (!adminRow?.role) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const event_id = body?.event_id as string | undefined;

  if (!event_id) {
    return NextResponse.json({ error: "Missing event_id" }, { status: 400 });
  }

  const { data: eventRow, error: eventErr } = await supabase
    .from("events")
    .select("id,title,event_date,host_user_id,group_id")
    .eq("id", event_id)
    .single();

  if (eventErr || !eventRow) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const { data: groupRow } = await supabase
    .from("groups")
    .select("slug")
    .eq("id", eventRow.group_id)
    .single();

  if (!groupRow || groupRow.slug !== "sunday") {
    return NextResponse.json({ error: "Event is not a Sunday event" }, { status: 400 });
  }

  if (!eventRow.host_user_id) {
    return NextResponse.json({ error: "Host not set for event" }, { status: 400 });
  }

  const { data: hostMembership } = await supabase
    .from("memberships")
    .select("user_id, profiles(full_name,email)")
    .eq("group_key", "sunday")
    .eq("status", "approved")
    .eq("user_id", eventRow.host_user_id)
    .maybeSingle();

  const hostEmail =
    (hostMembership as any)?.profiles?.email || null;

  if (!hostEmail) {
    return NextResponse.json({ error: "Host email not found" }, { status: 400 });
  }

  const { data: goingRsvps } = await supabase
    .from("rsvps")
    .select("user_id")
    .eq("event_id", event_id)
    .eq("status", "going");

  const userIds = Array.from(new Set((goingRsvps || []).map((r) => r.user_id)));

  let attendeeLines: string[] = [];

  if (userIds.length > 0) {
    const { data: attendeeMemberships } = await supabase
      .from("memberships")
      .select("user_id, profiles(full_name,email)")
      .eq("group_key", "sunday")
      .eq("status", "approved")
      .in("user_id", userIds);

    const attendeeMap = new Map<string, string>();

    (attendeeMemberships || []).forEach((row: any) => {
      attendeeMap.set(
        row.user_id,
        row?.profiles?.full_name || row?.profiles?.email || row.user_id
      );
    });

    attendeeLines = userIds.map((id, i) => `${i + 1}. ${attendeeMap.get(id) || id}`);
  }

  const when = new Date(eventRow.event_date).toLocaleString();
  const subject = `Sunday Poker Host List — ${eventRow.title} (${when})`;

  const bodyText =
    `Event: ${eventRow.title}\n` +
    `When: ${when}\n` +
    `Attending (GOING): ${attendeeLines.length}\n\n` +
    (attendeeLines.length ? attendeeLines.join("\n") : "No one marked GOING yet.");

  const mailto =
    `mailto:${encodeURIComponent(hostEmail)}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(bodyText)}`;

  return NextResponse.json({
    ok: true,
    to: hostEmail,
    subject,
    body: bodyText,
    mailto,
  });
}