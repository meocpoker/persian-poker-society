import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RSVPClient from "./RSVPClient";
import EmailHostButton from "./EmailHostButton";
import SetHostClient from "./SetHostClient";
import MonthCalendarClient from "./MonthCalendarClient";
import CardsToggleClient from "./CardsToggleClient";
import AdminPublishClient from "./AdminPublishClient";
import StartSessionClient from "./StartSessionClient";

type GroupKey = "doostaneh" | "sunday";

function Badge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "green" | "gold" | "red" | "blue";
}) {
  const tones: Record<string, React.CSSProperties> = {
    neutral: {
      border: "1px solid #D9D3C7",
      background: "#F8F3EA",
      color: "#4E5B55",
    },
    green: {
      border: "1px solid #B9D7CF",
      background: "#EDF7F4",
      color: "#1F7A63",
    },
    gold: {
      border: "1px solid #E5D2A1",
      background: "#FBF6EA",
      color: "#8A6A1F",
    },
    red: {
      border: "1px solid #E9C8CF",
      background: "#FDF0F2",
      color: "#8B1E2D",
    },
    blue: {
      border: "1px solid #BFD4F8",
      background: "#EEF4FF",
      color: "#1D4ED8",
    },
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 0.2,
        ...tones[tone],
      }}
    >
      {label}
    </span>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #E3E0D8",
        borderRadius: 20,
        padding: 18,
        background: "#FFFCF7",
        boxShadow: "0 10px 30px rgba(31, 42, 55, 0.05)",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 900, color: "#17342D" }}>{title}</div>
      {subtitle ? (
        <div style={{ fontSize: 13, color: "#6A746F", marginTop: 6 }}>{subtitle}</div>
      ) : null}
      <div style={{ marginTop: 16 }}>{children}</div>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        border: "1px solid #E3E0D8",
        background: "#F8F3EA",
        borderRadius: 12,
        padding: "8px 10px",
        minWidth: 90,
      }}
    >
      <div style={{ fontSize: 11, color: "#6A746F", fontWeight: 700 }}>{label}</div>
      <div style={{ marginTop: 2, fontSize: 15, color: "#17342D", fontWeight: 900 }}>{value}</div>
    </div>
  );
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

  if (!approved.includes("sunday")) {
    if (approved.length === 1 && approved[0] === "doostaneh") redirect("/dashboard/doostaneh");
    if (approved.length >= 2) redirect("/choose");
    redirect("/login");
  }

  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("group_key", "sunday")
    .maybeSingle();

  const isAdmin = !!adminRow;

  const { data: group } = await supabase
    .from("groups")
    .select("id")
    .eq("slug", "sunday")
    .maybeSingle();

  if (!group) {
    return <div style={{ padding: 24 }}>Group not found.</div>;
  }

  const { data: events } = await supabase
    .from("events")
    .select("id,title,event_date,status,group_id,host_user_id")
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
    .eq("group_key", "sunday")
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
    <div
      style={{
        minHeight: "100%",
        background: "linear-gradient(180deg, #FAF6EF 0%, #F7F1E7 100%)",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div
          style={{
            background: "#FFFCF7",
            border: "1px solid #E3E0D8",
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 16px 40px rgba(31, 42, 55, 0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 1.1,
                  textTransform: "uppercase",
                  color: "#C89B3C",
                }}
              >
                Persian Men Society
              </div>

              <h1
                style={{
                  fontSize: 34,
                  lineHeight: 1.1,
                  fontWeight: 900,
                  margin: "8px 0 0 0",
                  color: "#17342D",
                }}
              >
                Sunday Poker Calendar
              </h1>

              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Badge label="Sunday" tone="green" />
                {isAdmin && <Badge label="Admin" tone="gold" />}
                <Badge label={`${visibleEvents.length} Events`} tone="neutral" />
              </div>

              <div style={{ marginTop: 14, display: "flex", gap: 16, flexWrap: "wrap" }}>
                <Link
                  href="/dashboard"
                  style={{ color: "#1F7A63", fontWeight: 800, textDecoration: "none" }}
                >
                  ← Back to Dashboard
                </Link>
              </div>
            </div>

            <div style={{ width: "100%", maxWidth: 420 }}>
              <SectionCard
                title="Next 4 Upcoming Events"
                subtitle="Closest published or admin-visible Sunday events."
              >
                {!upcomingEvents.length ? (
                  <div style={{ fontSize: 14, color: "#6A746F" }}>No upcoming events.</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {upcomingEvents.map((e: any) => (
                      <div
                        key={e.id}
                        style={{
                          border: "1px solid #E3E0D8",
                          background: "#F8F3EA",
                          borderRadius: 14,
                          padding: 12,
                        }}
                      >
                        <div style={{ fontWeight: 900, color: "#17342D" }}>{e.title}</div>
                        <div style={{ marginTop: 4, fontSize: 13, color: "#6A746F" }}>
                          {new Date(e.event_date).toLocaleString()}
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <Badge
                            label={e.status === "published" ? "Published" : String(e.status)}
                            tone={e.status === "published" ? "green" : "neutral"}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.5fr) minmax(320px, 0.9fr)",
            gap: 18,
          }}
        >
          <SectionCard
            title="Calendar"
            subtitle="Monthly view of Sunday events."
          >
            <div
              style={{
                transformOrigin: "top left",
              }}
            >
              <MonthCalendarClient
                events={visibleEvents.map((e: any) => ({
                  id: e.id,
                  title: e.title,
                  event_date: e.event_date,
                }))}
              />
            </div>
          </SectionCard>

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
                              {new Date(e.event_date).toLocaleString()}
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <Badge
                              label={e.status === "published" ? "Published" : String(e.status)}
                              tone={e.status === "published" ? "green" : "neutral"}
                            />
                            {myStatusByEvent.get(e.id) === "going" && (
                              <Badge label="You are in" tone="green" />
                            )}
                            {myStatusByEvent.get(e.id) === "not_going" && (
                              <Badge label="You are out" tone="red" />
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
                            <StartSessionClient groupKey="sunday" startsAt={e.event_date} />
                          </div>
                        )}

                        <div style={{ marginTop: 10 }}>
                          <RSVPClient
                            eventId={e.id}
                            initialStatus={myStatusByEvent.get(e.id) ?? null}
                            eventStatus={e.status}
                            eventDate={e.event_date}
                          />
                        </div>

                        {isAdmin && (
                          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <MetricPill label="IN" value={counts.going} />
                            <MetricPill label="OUT" value={counts.not_going} />
                            <MetricPill label="TOTAL" value={totalResponses} />
                            <MetricPill label="NO RESPONSE" value={noResponse} />
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
                                <div key={idx} style={{ fontSize: 13, color: "#17342D", fontWeight: 700 }}>
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
                      </div>
                    );
                  })
                )}
              </div>
            </CardsToggleClient>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}