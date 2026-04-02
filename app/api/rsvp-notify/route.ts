import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatEventDate(eventDate: string) {
  const dateOnly = String(eventDate).slice(0, 10);
  const [year, month, day] = dateOnly.split("-").map(Number);
  const stableDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(stableDate);
}

export async function POST(req: Request) {
  console.log("[rsvp-notify] function called");

  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  console.log("[rsvp-notify] auth result:", !!userData?.user);
  if (!userData?.user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const event_id = String(body?.event_id || "").trim();
  const group_key = String(body?.group_key || "").trim();

  if (!event_id || !group_key) {
    return NextResponse.json({ ok: false, error: "Missing event_id or group_key" }, { status: 400 });
  }

  // Fetch the event
  const { data: eventRow, error: eventErr } = await supabase
    .from("events")
    .select("id, title, event_date, host_user_id, group_id")
    .eq("id", event_id)
    .maybeSingle();

  if (eventErr || !eventRow) {
    return NextResponse.json({ ok: true }); // silent
  }

  console.log("[rsvp-notify] event:", eventRow.title, "| host_user_id:", eventRow.host_user_id);

  if (!eventRow.host_user_id) {
    return NextResponse.json({ ok: true }); // no host assigned, nothing to do
  }

  // Confirm host has an approved membership for this group
  const { data: hostMembership } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("group_key", group_key)
    .eq("status", "approved")
    .eq("user_id", eventRow.host_user_id)
    .maybeSingle();

  if (!hostMembership) {
    console.log("[rsvp-notify] host membership NOT found for user:", eventRow.host_user_id);
    return NextResponse.json({ ok: true }); // host not an approved member, silent
  }

  console.log("[rsvp-notify] host membership found");

  // Fetch host email directly from profiles
  const { data: hostProfile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", eventRow.host_user_id)
    .maybeSingle();

  const hostEmail = hostProfile?.email ?? null;

  console.log("[rsvp-notify] host email:", hostEmail);

  if (!hostEmail) {
    return NextResponse.json({ ok: true }); // host has no email, silent
  }

  // Fetch all approved member user_ids for this group
  const { data: memberRows } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("group_key", group_key)
    .eq("status", "approved");

  const memberUserIds = (memberRows ?? []).map((m: any) => m.user_id).filter(Boolean);

  console.log("[rsvp-notify] member user IDs found:", memberUserIds.length);

  // Fetch profiles for those members
  const { data: profileRows } = memberUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", memberUserIds)
    : { data: [] as any[] };

  const memberMap = new Map<string, string>();
  (profileRows ?? []).forEach((p: any) => {
    memberMap.set(p.id, p.full_name || p.email || p.id);
  });

  // Fetch all "going" RSVPs for this event
  const { data: goingRsvps } = await supabase
    .from("rsvps")
    .select("user_id")
    .eq("event_id", event_id)
    .eq("status", "going");

  const goingNames = (goingRsvps ?? [])
    .map((r: any) => memberMap.get(r.user_id) || r.user_id)
    .sort();

  // Check Resend is configured
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESULTS_EMAIL_FROM || process.env.RESEND_FROM_EMAIL;

  if (!resendApiKey || !fromEmail) {
    console.log("[rsvp-notify] Resend NOT configured — RESEND_API_KEY:", !!resendApiKey, "| fromEmail:", !!fromEmail);
    return NextResponse.json({ ok: true }); // not configured, silent
  }

  console.log("[rsvp-notify] Resend configured — sending email to:", hostEmail);

  const eventDateFormatted = formatEventDate(eventRow.event_date);
  const subject = `${eventRow.title} - Updated Attendance List`;

  const textBody =
    `Event: ${eventRow.title}\n` +
    `Date: ${eventDateFormatted}\n` +
    `Players Coming: ${goingNames.length}\n\n` +
    (goingNames.length
      ? goingNames.map((n, i) => `${i + 1}. ${n}`).join("\n")
      : "No one has RSVPed yet.");

  const htmlRows = goingNames
    .map(
      (name, i) =>
        `<tr><td style="padding:6px 10px;border:1px solid #d9d3c7;">${i + 1}</td>` +
        `<td style="padding:6px 10px;border:1px solid #d9d3c7;">${escapeHtml(name)}</td></tr>`
    )
    .join("");

  const htmlBody = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#17342D;line-height:1.5;">
      <h2 style="margin:0 0 8px 0;">${escapeHtml(eventRow.title)}</h2>
      <p style="margin:0 0 4px 0;"><strong>Date:</strong> ${escapeHtml(eventDateFormatted)}</p>
      <p style="margin:0 0 18px 0;"><strong>Players Coming:</strong> ${goingNames.length}</p>
      ${goingNames.length ? `
      <table style="border-collapse:collapse;width:100%;max-width:480px;">
        <thead>
          <tr>
            <th style="padding:6px 10px;border:1px solid #d9d3c7;background:#F8F3EA;text-align:left;">#</th>
            <th style="padding:6px 10px;border:1px solid #d9d3c7;background:#F8F3EA;text-align:left;">Player</th>
          </tr>
        </thead>
        <tbody>${htmlRows}</tbody>
      </table>` : `<p style="color:#6A746F;">No one has RSVPed yet.</p>`}
    </div>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [hostEmail],
      subject,
      text: textBody,
      html: htmlBody,
    }),
  }).catch(() => {}); // silent on send failure

  return NextResponse.json({ ok: true });
}
