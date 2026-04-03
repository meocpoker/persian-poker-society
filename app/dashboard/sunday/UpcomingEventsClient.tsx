"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type EventRow = {
  id: string;
  title: string;
  event_date: string;
  status: string;
  goingCount: number;
  goingNames: string[];
  myStatus: string | null;
};

type GroupKey = "sunday" | "friday";

export default function UpcomingEventsClient({
  events,
  groupKey,
  formatDate,
}: {
  events: EventRow[];
  groupKey: GroupKey;
  formatDate: (d: string) => string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [myStatuses, setMyStatuses] = useState<Record<string, string | null>>(
    () => Object.fromEntries(events.map((e) => [e.id, e.myStatus]))
  );
  const [goingCounts, setGoingCounts] = useState<Record<string, number>>(
    () => Object.fromEntries(events.map((e) => [e.id, e.goingCount]))
  );
  const [goingNamesList, setGoingNamesList] = useState<Record<string, string[]>>(
    () => Object.fromEntries(events.map((e) => [e.id, e.goingNames]))
  );
  const [pending, setPending] = useState<string | null>(null);

  const supabase = createClient();

  async function setRsvp(eventId: string, eventStatus: string, nextStatus: "going" | "not_going") {
    if (pending) return;
    if (eventStatus !== "published") return;

    setPending(eventId);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Not authenticated");
      setPending(null);
      return;
    }

    // Fetch current user's profile name for optimistic update
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();
    const myName = profile?.full_name || profile?.email || "You";

    const { error } = await supabase
      .from("rsvps")
      .upsert(
        { event_id: eventId, user_id: user.id, status: nextStatus },
        { onConflict: "event_id,user_id" }
      );

    if (error) {
      alert(error.message);
      setPending(null);
      return;
    }

    const prev = myStatuses[eventId];

    // Update local state optimistically
    setMyStatuses((s) => ({ ...s, [eventId]: nextStatus }));
    setGoingCounts((c) => {
      const cur = c[eventId] ?? 0;
      const wasGoing = prev === "going";
      const nowGoing = nextStatus === "going";
      if (wasGoing && !nowGoing) return { ...c, [eventId]: Math.max(0, cur - 1) };
      if (!wasGoing && nowGoing) return { ...c, [eventId]: cur + 1 };
      return c;
    });
    setGoingNamesList((n) => {
      const cur = n[eventId] ?? [];
      const wasGoing = prev === "going";
      const nowGoing = nextStatus === "going";
      if (wasGoing && !nowGoing) return { ...n, [eventId]: cur.filter((name) => name !== myName) };
      if (!wasGoing && nowGoing && !cur.includes(myName)) return { ...n, [eventId]: [...cur, myName] };
      return n;
    });

    // Fire-and-forget host notification
    fetch("/api/rsvp-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, group_key: groupKey }),
    }).catch(() => {});

    setPending(null);
  }

  if (!events.length) {
    return <div style={{ fontSize: 14, color: "#6A746F" }}>No upcoming events.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {events.map((e) => {
        const isExpanded = expandedId === e.id;
        const myStatus = myStatuses[e.id] ?? null;
        const goingCount = goingCounts[e.id] ?? 0;
        const names = goingNamesList[e.id] ?? [];
        const isPublished = e.status === "published";
        const isPast = new Date(e.event_date).getTime() < Date.now();
        const rsvpDisabled = !isPublished || isPast || !!pending;

        return (
          <div
            key={e.id}
            style={{
              border: "1px solid #E3E0D8",
              background: "#F8F3EA",
              borderRadius: 14,
              padding: 12,
              cursor: "pointer",
            }}
            onClick={() => setExpandedId(isExpanded ? null : e.id)}
          >
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ fontWeight: 900, color: "#17342D" }}>{e.title}</div>
              <div style={{ fontSize: 12, color: "#6A746F", flexShrink: 0 }}>
                {isExpanded ? "▲" : "▼"}
              </div>
            </div>

            <div style={{ marginTop: 4, fontSize: 13, color: "#6A746F" }}>
              {formatDate(e.event_date)}
            </div>

            {/* Status + attending count */}
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 800,
                  border: e.status === "published" ? "1px solid #B9D7CF" : "1px solid #D9D3C7",
                  background: e.status === "published" ? "#EDF7F4" : "#F8F3EA",
                  color: e.status === "published" ? "#1F7A63" : "#6A746F",
                }}
              >
                {e.status === "published" ? "Published" : String(e.status)}
              </span>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 800,
                  border: goingCount > 0 ? "1px solid #B9D7CF" : "1px solid #D9D3C7",
                  background: goingCount > 0 ? "#EDF7F4" : "#F8F3EA",
                  color: goingCount > 0 ? "#1F7A63" : "#6A746F",
                }}
              >
                {goingCount} attending
              </span>

              {myStatus === "going" && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "4px 10px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 800,
                    border: "1px solid #B9D7CF",
                    background: "#EDF7F4",
                    color: "#1F7A63",
                  }}
                >
                  You are in
                </span>
              )}
              {myStatus === "not_going" && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "4px 10px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 800,
                    border: "1px solid #E9C8CF",
                    background: "#FDF0F2",
                    color: "#8B1E2D",
                  }}
                >
                  You are out
                </span>
              )}
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div
                onClick={(ev) => ev.stopPropagation()}
                style={{ marginTop: 12, borderTop: "1px solid #E3E0D8", paddingTop: 12 }}
              >
                {/* RSVP buttons */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    disabled={rsvpDisabled}
                    onClick={() => setRsvp(e.id, e.status, "going")}
                    style={{
                      padding: "9px 14px",
                      borderRadius: 12,
                      border: "1px solid #1F7A63",
                      background: myStatus === "going" ? "#1F7A63" : "#FFFCF7",
                      color: myStatus === "going" ? "#FFFDF8" : "#1F7A63",
                      fontWeight: 900,
                      fontSize: 13,
                      cursor: rsvpDisabled ? "not-allowed" : "pointer",
                      opacity: rsvpDisabled ? 0.7 : 1,
                    }}
                  >
                    {pending === e.id && myStatus !== "going" ? "Saving..." : "I'm In"}
                  </button>

                  <button
                    type="button"
                    disabled={rsvpDisabled}
                    onClick={() => setRsvp(e.id, e.status, "not_going")}
                    style={{
                      padding: "9px 14px",
                      borderRadius: 12,
                      border: "1px solid #8B1E2D",
                      background: myStatus === "not_going" ? "#8B1E2D" : "#FFF3F4",
                      color: myStatus === "not_going" ? "#FFFDF8" : "#8B1E2D",
                      fontWeight: 900,
                      fontSize: 13,
                      cursor: rsvpDisabled ? "not-allowed" : "pointer",
                      opacity: rsvpDisabled ? 0.7 : 1,
                    }}
                  >
                    {pending === e.id && myStatus !== "not_going" ? "Saving..." : "I'm Out"}
                  </button>

                  {!isPublished && (
                    <div style={{ fontSize: 12, color: "#6A746F", alignSelf: "center" }}>
                      RSVP opens after publish
                    </div>
                  )}
                  {isPast && (
                    <div style={{ fontSize: 12, color: "#6A746F", alignSelf: "center" }}>
                      Event has passed
                    </div>
                  )}
                </div>

                {/* Going players list */}
                {names.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#6A746F", marginBottom: 4 }}>
                      Attending
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {names.map((name, i) => (
                        <span
                          key={i}
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
            )}
          </div>
        );
      })}
    </div>
  );
}
