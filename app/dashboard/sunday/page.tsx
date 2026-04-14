import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import RSVPClient from "./RSVPClient";
import CreateSundayEventClient from "./CreateSundayEventClient";
import CloseEventClient from "./CloseEventClient";
import PastResultsClient from "./PastResultsClient";
import PageShell from "@/app/components/ui/PageShell";
import SectionCard from "@/app/components/ui/SectionCard";
import Badge from "@/app/components/ui/Badge";

type GroupKey = "doostaneh" | "sunday";

function formatSundayEventDate(eventDate: string) {
  const dateOnly = String(eventDate).slice(0, 10);
  const [year, month, day] = dateOnly.split("-").map(Number);

  const stableDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  const datePart = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(stableDate);

  return `${datePart}, 12:00 PM`;
}

export default async function SundayDashboard() {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) redirect("/login");

  const { data: memberships, error: memErr } = await supabase
    .from("memberships")
    .select("group_key,status")
    .eq("user_id", user.id);

  if (memErr) redirect("/login");

  const approved: GroupKey[] = (memberships || [])
    .filter((m: any) => m.status === "approved")
    .map((m: any) => m.group_key);

  const { data: adminRows } = await supabase
    .from("admins")
    .select("user_id, group_key, role")
    .eq("user_id", user.id);

  const isMaster = (adminRows ?? []).some((r: any) => r.role === "master");

  if (!isMaster && !approved.includes("sunday")) {
    if (approved.length === 1 && approved[0] === "doostaneh") redirect("/dashboard/doostaneh");
    if (approved.length >= 2) redirect("/choose");
    redirect("/login");
  }

  const hasSundayAdminRow = (adminRows ?? []).some((r: any) => r.group_key === "sunday");
  const isAdmin = isMaster || hasSundayAdminRow;

  let pendingCount = 0;

  if (isAdmin) {
    const { count } = await supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("group_key", "sunday");

    pendingCount = count || 0;
  }

  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .eq("slug", "sunday")
    .maybeSingle();

  if (!group) {
    return <div style={{ padding: 24 }}>Group not found.</div>;
  }

  const serviceSupabase = createServiceClient();

  const { data: events } = await serviceSupabase
    .from("events")
    .select("id,title,event_date,status,group_id,host_user_id,host_address,host_phone,notes")
    .eq("group_id", group.id)
    .order("event_date", { ascending: false });

  const allEvents = events ?? [];

  const visibleEvents = isAdmin
    ? allEvents
    : allEvents.filter((e: any) => e.status === "published");

  const eventIds = visibleEvents.map((e: any) => e.id);

  const { data: memberRows } = await serviceSupabase
    .from("memberships")
    .select("user_id")
    .eq("group_key", "sunday")
    .eq("status", "approved");

  const memberUserIds = (memberRows ?? []).map((m: any) => m.user_id).filter(Boolean);

  const { data: profileRows } = memberUserIds.length
    ? await serviceSupabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", memberUserIds)
    : { data: [] as any[] };

  const profilesById = new Map(
    (profileRows ?? []).map((p: any) => [p.id, { full_name: p.full_name ?? null, email: p.email ?? null }])
  );

  const members = (memberRows ?? []).map((m: any) => ({
    user_id: m.user_id,
    profiles: profilesById.get(m.user_id) ?? null,
  }));

  // Build member options for CreateSundayEventClient
  const memberOptions = (memberRows ?? []).map((m: any) => {
    const profile = profilesById.get(m.user_id);
    return {
      user_id: m.user_id,
      name: profile?.full_name || profile?.email || m.user_id,
    };
  });

  // Build hostInfoMap: most recent address/phone per host user_id
  const { data: hostEvents } = await serviceSupabase
    .from("events")
    .select("host_user_id, host_address, host_phone")
    .eq("group_id", group.id)
    .not("host_user_id", "is", null)
    .order("event_date", { ascending: false });

  const hostInfoMap: Record<string, { address: string | null; phone: string | null }> = {};
  for (const ev of (hostEvents ?? []) as any[]) {
    if (ev.host_user_id && !hostInfoMap[ev.host_user_id]) {
      hostInfoMap[ev.host_user_id] = {
        address: ev.host_address ?? null,
        phone: ev.host_phone ?? null,
      };
    }
  }

  const { data: myRsvps } = eventIds.length
    ? await supabase
        .from("rsvps")
        .select("event_id,status")
        .eq("user_id", user.id)
        .in("event_id", eventIds)
    : { data: [] as any[] };

  const { data: allRsvps } = eventIds.length
    ? await supabase
        .from("rsvps")
        .select("event_id,status,user_id")
        .in("event_id", eventIds)
    : { data: [] as any[] };

  const myStatusByEvent = new Map<string, string>();
  (myRsvps ?? []).forEach((r: any) => myStatusByEvent.set(r.event_id, r.status));

  const goingNames = new Map<string, string[]>();

  (allRsvps ?? []).forEach((r: any) => {
    if (!goingNames.has(r.event_id)) goingNames.set(r.event_id, []);
    if (r.status === "going") {
      const member = members?.find((m: any) => m.user_id === r.user_id);
      const name =
        (member as any)?.profiles?.full_name ||
        (member as any)?.profiles?.email ||
        "Unnamed";
      goingNames.get(r.event_id)!.push(name);
    }
  });

  const now = new Date();
  const nearestUpcoming = [...visibleEvents]
    .filter((e: any) => new Date(e.event_date).getTime() >= now.getTime())
    .sort((a: any, b: any) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())[0] ?? null;

  const activeHostName = nearestUpcoming?.host_user_id
    ? (profilesById.get(nearestUpcoming.host_user_id)?.full_name ||
       profilesById.get(nearestUpcoming.host_user_id)?.email || null)
    : null;

  let activeSessionId: string | null = null;
  if (nearestUpcoming) {
    const { data: activeSession } = await serviceSupabase
      .from("sessions")
      .select("id")
      .eq("group_key", "sunday")
      .eq("starts_at", nearestUpcoming.event_date)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    activeSessionId = activeSession?.id ?? null;
  }

  return (
    <PageShell
      eyebrow="Persian Men Society"
      title="Sunday Poker Calendar"
      description="Create events, manage RSVPs, assign hosts, and start Sunday sessions."
      actions={
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Badge variant="green">Sunday</Badge>

          {isAdmin && (
            <Link
              href="/admin"
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "8px 12px",
                borderRadius: 999,
                background: "#111827",
                color: "#ffffff",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              Admin
              {pendingCount > 0 && (
                <span
                  style={{
                    marginLeft: 8,
                    background: "#DC2626",
                    color: "#ffffff",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "2px 6px",
                    lineHeight: 1,
                  }}
                >
                  {pendingCount}
                </span>
              )}
            </Link>
          )}

          <Link
            href="/dashboard"
            style={{ color: "#1F7A63", fontWeight: 800, textDecoration: "none" }}
          >
            ← Back to Dashboard
          </Link>

          <form action="/auth/logout" method="post" style={{ margin: 0 }}>
            <button
              type="submit"
              style={{
                border: "1px solid #D6D3CB",
                background: "#FFFFFF",
                color: "#17342D",
                borderRadius: 12,
                padding: "10px 14px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </form>
        </div>
      }
    >
      {/* Admin: Create Event */}
      {isAdmin && (
        <div style={{ marginBottom: 18 }}>
          <SectionCard
            title="Create Sunday Event"
            subtitle="Schedule a date, optionally assign a host, and start a cash session."
          >
            <CreateSundayEventClient
              members={memberOptions}
              hostInfoMap={hostInfoMap}
            />
          </SectionCard>
        </div>
      )}

      {/* Admin: Close active event */}
      {isAdmin && nearestUpcoming && nearestUpcoming.status === "published" && (
        <div style={{ marginBottom: 18 }}>
          <SectionCard
            title={nearestUpcoming.title}
            subtitle={formatSundayEventDate(nearestUpcoming.event_date)}
          >
            <div style={{ display: "grid", gap: 10 }}>
              {(goingNames.get(nearestUpcoming.id)?.length ?? 0) > 0 ? (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#6A746F", marginBottom: 6 }}>
                    {goingNames.get(nearestUpcoming.id)!.length} going
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {goingNames.get(nearestUpcoming.id)!.map((name, idx) => (
                      <span key={idx} style={{ padding: "4px 10px", borderRadius: 999, fontSize: 12,
                        fontWeight: 700, background: "#FFFCF7", border: "1px solid #D9D3C7", color: "#17342D" }}>
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "#6A746F" }}>0 going</div>
              )}
              {activeSessionId && (
                <div>
                  <Link
                    href={`/dashboard/sunday/sessions/${activeSessionId}`}
                    style={{ display: "inline-flex", alignItems: "center", padding: "9px 14px",
                      borderRadius: 12, border: "1px solid #1F7A63", background: "#EDF7F4",
                      color: "#1F7A63", fontWeight: 900, fontSize: 13, textDecoration: "none" }}
                  >
                    Manage Session →
                  </Link>
                </div>
              )}
              <RSVPClient
                eventId={nearestUpcoming.id}
                initialStatus={myStatusByEvent.get(nearestUpcoming.id) ?? null}
                eventStatus={nearestUpcoming.status}
                eventDate={nearestUpcoming.event_date}
              />
              <CloseEventClient eventId={nearestUpcoming.id} />
            </div>
          </SectionCard>
        </div>
      )}

      {/* Player view: active event */}
      {!isAdmin && (
        <div style={{ marginBottom: 18 }}>
          <SectionCard title="Next Sunday Event" subtitle="Your upcoming poker session.">
            {nearestUpcoming ? (
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16, color: "#17342D" }}>
                    {nearestUpcoming.title}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 13, color: "#6A746F" }}>
                    {formatSundayEventDate(nearestUpcoming.event_date)}
                  </div>
                  {activeHostName && (
                    <div style={{ marginTop: 6, fontSize: 13, color: "#17342D", fontWeight: 700 }}>
                      Host: {activeHostName}
                    </div>
                  )}
                  {nearestUpcoming.host_address && (
                    <div style={{ marginTop: 2, fontSize: 13, color: "#6A746F" }}>
                      {nearestUpcoming.host_address}
                      {nearestUpcoming.host_phone ? ` · ${nearestUpcoming.host_phone}` : ""}
                    </div>
                  )}
                </div>

                <RSVPClient
                  eventId={nearestUpcoming.id}
                  initialStatus={myStatusByEvent.get(nearestUpcoming.id) ?? null}
                  eventStatus={nearestUpcoming.status}
                  eventDate={nearestUpcoming.event_date}
                />

                {(goingNames.get(nearestUpcoming.id)?.length ?? 0) > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#6A746F", marginBottom: 6 }}>
                      Attending
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {goingNames.get(nearestUpcoming.id)!.map((name, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            background: "#FFFCF7",
                            border: "1px solid #D9D3C7",
                            color: "#17342D",
                          }}
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 14, color: "#6A746F" }}>No upcoming Sunday event scheduled.</div>
            )}
          </SectionCard>
        </div>
      )}

      {/* Past Results */}
      <div style={{ marginTop: 18 }}>
        <SectionCard
          title="Past Results"
          subtitle="Monthly cash game results for Sunday sessions."
        >
          <PastResultsClient />
        </SectionCard>
      </div>
    </PageShell>
  );
}
