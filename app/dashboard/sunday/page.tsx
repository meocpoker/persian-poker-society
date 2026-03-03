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
    if (approved.length === 1 && approved[0] === "doostaneh")
      redirect("/dashboard/doostaneh");
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

  // Fetch members FIRST (used later)
  const { data: members } = await supabase
    .from("memberships")
    .select("user_id, profiles(full_name,email)")
    .eq("group_key", "sunday")
    .eq("status", "approved");

  const approvedCount = members?.length ?? 0;

  // Current user's RSVPs
  const { data: myRsvps } = eventIds.length
    ? await supabase
        .from("rsvps")
        .select("event_id,status")
        .eq("user_id", user.id)
        .in("event_id", eventIds)
    : { data: [] as any[] };

  // All RSVPs for metrics + names
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

      const name = member?.profiles?.full_name || member?.profiles?.email || "Unnamed";

      goingNames.get(r.event_id)!.push(name);
    }

    if (r.status === "not_going") {
      entry.not_going += 1;
    }
  });

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900 }}>Sunday Poker Calendar</h1>

        {isAdmin && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              padding: "4px 10px",
              borderRadius: 999,
              background: "rgba(16,185,129,0.12)",
              color: "#065f46",
            }}
          >
            ADMIN
          </span>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <MonthCalendarClient
          events={visibleEvents.map((e: any) => ({
            id: e.id,
            title: e.title,
            event_date: e.event_date,
          }))}
        />
      </div>

      <CardsToggleClient>
        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 900 }}>Upcoming Events</h2>

          {!visibleEvents.length ? (
            <p style={{ marginTop: 12, color: "#64748b" }}>No events scheduled.</p>
          ) : (
            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              {visibleEvents.map((e: any) => (
                <div
                  key={e.id}
                  id={`event-${e.id}`}
                  style={{
                    border: "1px solid rgba(15,23,42,0.12)",
                    borderRadius: 14,
                    padding: 14,
                    background: "white",
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{e.title}</div>

                  {isAdmin && (
                    <div style={{ marginTop: 6 }}>
                      <AdminPublishClient eventId={e.id} currentStatus={e.status} />
                    </div>
                  )}

                  {/* ✅ Start Session buttons (admin only) */}
                  {isAdmin && (
                    <div style={{ marginTop: 8 }}>
                      <StartSessionClient groupKey="sunday" startsAt={e.event_date} />
                    </div>
                  )}

                  <div style={{ marginTop: 4, fontSize: 13, color: "#475569" }}>
                    {new Date(e.event_date).toLocaleString()}
                  </div>

                  <RSVPClient
                    eventId={e.id}
                    initialStatus={myStatusByEvent.get(e.id) ?? null}
                    eventStatus={e.status}
                    eventDate={e.event_date}
                  />

                  {isAdmin && (
                    <div style={{ marginTop: 8, fontSize: 12, fontWeight: 800 }}>
                      <div>IN: {rsvpCounts.get(e.id)?.going ?? 0}</div>

                      {(goingNames.get(e.id)?.length ?? 0) > 0 && (
                        <div style={{ marginTop: 4 }}>
                          {goingNames.get(e.id)!.map((name, idx) => (
                            <div key={idx}>{name}</div>
                          ))}
                        </div>
                      )}

                      <div>OUT: {rsvpCounts.get(e.id)?.not_going ?? 0}</div>

                      <div>
                        TOTAL:{" "}
                        {(rsvpCounts.get(e.id)?.going ?? 0) + (rsvpCounts.get(e.id)?.not_going ?? 0)}
                      </div>

                      <div>
                        NO RESPONSE:{" "}
                        {approvedCount -
                          ((rsvpCounts.get(e.id)?.going ?? 0) + (rsvpCounts.get(e.id)?.not_going ?? 0))}
                      </div>
                    </div>
                  )}

                  {isAdmin && members && (
                    <div style={{ marginTop: 10 }}>
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
                    <div style={{ marginTop: 10 }}>
                      <EmailHostButton eventId={e.id} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardsToggleClient>
    </div>
  );
}