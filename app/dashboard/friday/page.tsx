import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RSVPClient from "../sunday/RSVPClient";
import EmailHostButton from "../sunday/EmailHostButton";
import SetHostClient from "../sunday/SetHostClient";
import DeleteEventClient from "../sunday/DeleteEventClient";
import EventNoteClient from "../sunday/EventNoteClient";
import MonthCalendarClient from "../sunday/MonthCalendarClient";
import CardsToggleClient from "../sunday/CardsToggleClient";
import AdminPublishClient from "../sunday/AdminPublishClient";
import StartSessionClient from "../sunday/StartSessionClient";
import CreateFridayEventClient from "./CreateFridayEventClient";
import UpcomingEventsClient from "../sunday/UpcomingEventsClient";
import PageShell from "@/app/components/ui/PageShell";
import SectionCard from "@/app/components/ui/SectionCard";
import Badge from "@/app/components/ui/Badge";
import MetricPill from "@/app/components/ui/MetricPill";

type GroupKey = "doostaneh" | "sunday" | "friday";

function formatFridayEventDate(eventDate: string) {
  const dateOnly = String(eventDate).slice(0, 10);
  const [year, month, day] = dateOnly.split("-").map(Number);

  const stableDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  const datePart = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(stableDate);

  return `${datePart}, 7:00 PM ET`;
}

export default async function FridayDashboard() {
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

  if (!approved.includes("friday")) {
    if (approved.length === 1 && approved[0] === "doostaneh") redirect("/dashboard/doostaneh");
    if (approved.length === 1 && approved[0] === "sunday") redirect("/dashboard/sunday");
    if (approved.length >= 2) redirect("/choose");
    redirect("/login");
  }

  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("group_key", "friday")
    .maybeSingle();

  const isAdmin = !!adminRow;

  let pendingCount = 0;

  if (isAdmin) {
    const { count } = await supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("group_key", "friday");

    pendingCount = count || 0;
  }

  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .eq("slug", "friday")
    .maybeSingle();

  if (!group) {
    return <div style={{ padding: 24 }}>Group not found.</div>;
  }

  const { data: events } = await supabase
    .from("events")
    .select("id,title,event_date,status,group_id,host_user_id,notes")
    .eq("group_id", group.id)
    .order("event_date", { ascending: true });

  const allEvents = events ?? [];

  const visibleEvents = isAdmin
    ? allEvents
    : allEvents.filter((e: any) => e.status === "published");

  const eventIds = visibleEvents.map((e: any) => e.id);

  const { data: members } = await supabase
    .from("memberships")
    .select("user_id, profiles(full_name,email)")
    .eq("group_key", "friday")
    .eq("status", "approved");

  const approvedCount = members?.length ?? 0;

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

  const rsvpCounts = new Map<string, { going: number; not_going: number }>();
  const goingNames = new Map<string, string[]>();

  (allRsvps ?? []).forEach((r: any) => {
    if (!rsvpCounts.has(r.event_id)) {
      rsvpCounts.set(r.event_id, { going: 0, not_going: 0 });
      goingNames.set(r.event_id, []);
    }

    const entry = rsvpCounts.get(r.event_id)!;

    if (r.status === "going") {
      entry.going += 1;

      const member = members?.find((m: any) => m.user_id === r.user_id);
      const name =
        (member as any)?.profiles?.full_name ||
        (member as any)?.profiles?.email ||
        "Unnamed";

      goingNames.get(r.event_id)!.push(name);
    }

    if (r.status === "not_going") {
      entry.not_going += 1;
    }
  });

  const now = new Date();
  const upcomingEvents = visibleEvents
    .filter((e: any) => new Date(e.event_date).getTime() >= now.getTime())
    .slice(0, 4);

  return (
    <PageShell
      eyebrow="Persian Men Society"
      title="Friday Poker Calendar"
      description="Create events, manage RSVPs, assign hosts, and start Friday sessions."
      actions={
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Badge variant="green">Friday</Badge>

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

          <Badge variant="gray">{visibleEvents.length} Events</Badge>

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
      {isAdmin && (
        <div style={{ marginBottom: 18 }}>
          <SectionCard
            title="Create Friday Event"
            subtitle="Schedule a Friday date first, then publish it and start a cash session."
          >
            <CreateFridayEventClient />
          </SectionCard>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.5fr) minmax(320px, 0.9fr)",
          gap: 18,
        }}
      >
        <SectionCard title="Calendar" subtitle="Monthly view of Friday events.">
          <MonthCalendarClient
            events={visibleEvents.map((e: any) => ({
              id: e.id,
              title: e.title,
              event_date: e.event_date,
            }))}
          />
        </SectionCard>

        <SectionCard
          title="Next 4 Upcoming Events"
          subtitle="Closest Friday events visible to you."
        >
          <UpcomingEventsClient
            events={upcomingEvents.map((e: any) => ({
              id: e.id,
              title: e.title,
              event_date: e.event_date,
              status: e.status,
              goingCount: rsvpCounts.get(e.id)?.going ?? 0,
              goingNames: goingNames.get(e.id) ?? [],
              myStatus: myStatusByEvent.get(e.id) ?? null,
            }))}
            groupKey="friday"
            formatDate={formatFridayEventDate}
          />
        </SectionCard>
      </div>

      <div style={{ marginTop: 18 }}>
        <SectionCard
          title="Event List"
          subtitle="Use the toggle below to show all admin-created events."
        >
          <CardsToggleClient>
            <div style={{ display: "grid", gap: 12 }}>
              {!visibleEvents.length ? (
                <div style={{ fontSize: 14, color: "#6A746F" }}>No events scheduled.</div>
              ) : (
                visibleEvents.map((e: any) => {
                  const counts = rsvpCounts.get(e.id) ?? { going: 0, not_going: 0 };
                  const totalResponses = counts.going + counts.not_going;
                  const noResponse = approvedCount - totalResponses;

                  return (
                    <div
                      key={e.id}
                      id={`event-${e.id}`}
                      style={{
                        border: "1px solid #E3E0D8",
                        borderRadius: 16,
                        padding: 16,
                        background: "#FFFCF7",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 900, fontSize: 16, color: "#17342D" }}>
                            {e.title}
                          </div>
                          <div style={{ marginTop: 4, fontSize: 13, color: "#6A746F" }}>
                            {formatFridayEventDate(e.event_date)}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <Badge variant={e.status === "published" ? "green" : "gray"}>
                            {e.status === "published" ? "Published" : String(e.status)}
                          </Badge>
                          {myStatusByEvent.get(e.id) === "going" && (
                            <Badge variant="green">You are in</Badge>
                          )}
                          {myStatusByEvent.get(e.id) === "not_going" && (
                            <Badge variant="red">You are out</Badge>
                          )}
                        </div>
                      </div>

                      {isAdmin && (
                        <div style={{ marginTop: 10 }}>
                          <AdminPublishClient eventId={e.id} currentStatus={e.status} />
                        </div>
                      )}

                      {isAdmin && (
                        <div style={{ marginTop: 10 }}>
                          <StartSessionClient groupKey="friday" startsAt={e.event_date} />
                        </div>
                      )}

                      <div style={{ marginTop: 10 }}>
                        <RSVPClient
                          eventId={e.id}
                          initialStatus={myStatusByEvent.get(e.id) ?? null}
                          eventStatus={e.status}
                          eventDate={e.event_date}
                          groupKey="friday"
                        />
                      </div>

                      {isAdmin && (
                        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <MetricPill label="IN" value={counts.going} color="green" />
                          <MetricPill label="OUT" value={counts.not_going} color="red" />
                          <MetricPill label="TOTAL" value={totalResponses} color="gray" />
                          <MetricPill label="NO RESPONSE" value={noResponse} color="gray" />
                        </div>
                      )}

                      {isAdmin && (goingNames.get(e.id)?.length ?? 0) > 0 && (
                        <div
                          style={{
                            marginTop: 12,
                            border: "1px solid #E3E0D8",
                            background: "#F8F3EA",
                            borderRadius: 12,
                            padding: 10,
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 800, color: "#6A746F" }}>
                            Going
                          </div>
                          <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
                            {goingNames.get(e.id)!.map((name, idx) => (
                              <div
                                key={idx}
                                style={{ fontSize: 13, color: "#17342D", fontWeight: 700 }}
                              >
                                {name}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {isAdmin && members && (
                        <div style={{ marginTop: 12 }}>
                          <SetHostClient
                            eventId={e.id}
                            currentHostId={e.host_user_id ?? null}
                            members={(members ?? []).map((m: any, idx: number) => ({
                              user_id: m.user_id,
                              full_name: m.profiles?.full_name ?? null,
                              email: m.profiles?.email ?? null,
                              _k: `${m.user_id}-${idx}`,
                            }))}
                          />
                        </div>
                      )}

                      {isAdmin && (
                        <div style={{ marginTop: 12 }}>
                          <EmailHostButton eventId={e.id} />
                        </div>
                      )}

                      {isAdmin && (
                        <div style={{ marginTop: 12 }}>
                          <DeleteEventClient eventId={e.id} />
                        </div>
                      )}

                      <EventNoteClient
                        eventId={e.id}
                        initialNote={e.notes ?? null}
                        isHost={e.host_user_id === user.id}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </CardsToggleClient>
        </SectionCard>
      </div>
    </PageShell>
  );
}