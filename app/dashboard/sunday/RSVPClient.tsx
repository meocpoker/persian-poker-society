"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RSVPClient({
  eventId,
  initialStatus,
  eventStatus,
  eventDate,
}: {
  eventId: string;
  initialStatus: string | null;
  eventStatus: string;
  eventDate: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(initialStatus);
  const [pending, startTransition] = useTransition();

  const isPublished = eventStatus === "published";
  const isPast = new Date(eventDate).getTime() < Date.now();
  const disabled = pending || !isPublished || isPast;

  async function setRsvp(nextStatus: "going" | "not_going") {
    startTransition(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Not authenticated");
        return;
      }

      const { error } = await supabase
        .from("rsvps")
        .upsert(
          {
            event_id: eventId,
            user_id: user.id,
            status: nextStatus,
          },
          { onConflict: "event_id,user_id" }
        );

      if (error) {
        alert(error.message);
        return;
      }

      setStatus(nextStatus);
      router.refresh();
    });
  }

  return (
    <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setRsvp("going")}
        style={{
          padding: "10px 14px",
          borderRadius: 14,
          border: "1px solid #1F7A63",
          background: status === "going" ? "#1F7A63" : "#FFFCF7",
          color: status === "going" ? "#FFFDF8" : "#1F7A63",
          fontWeight: 900,
          fontSize: 13,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.7 : 1,
        }}
      >
        {pending && status !== "going" ? "Saving..." : "I’m In"}
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setRsvp("not_going")}
        style={{
          padding: "10px 14px",
          borderRadius: 14,
          border: "1px solid #8B1E2D",
          background: status === "not_going" ? "#8B1E2D" : "#FFF3F4",
          color: status === "not_going" ? "#FFFDF8" : "#8B1E2D",
          fontWeight: 900,
          fontSize: 13,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.7 : 1,
        }}
      >
        {pending && status !== "not_going" ? "Saving..." : "I’m Out"}
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
  );
}