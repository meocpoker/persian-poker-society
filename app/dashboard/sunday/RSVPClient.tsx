"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type RSVPStatus = "going" | "not_going";

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

  const [status, setStatus] = useState<string | null>(initialStatus);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isLocked = useMemo(() => {
    // Manual lock: scheduled
    if (eventStatus === "scheduled") return true;

    // Auto-lock: once event time has passed (client time)
    const t = new Date(eventDate).getTime();
    if (!Number.isFinite(t)) return false;

    return Date.now() >= t;
  }, [eventStatus, eventDate]);

  async function setRSVP(next: RSVPStatus) {
    if (busy || isLocked) return;

    setBusy(true);
    setErr(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErr("Not authenticated");
      setBusy(false);
      return;
    }

    const { error } = await supabase.from("rsvps").upsert(
      {
        event_id: eventId,
        user_id: user.id,
        status: next,
      },
      { onConflict: "event_id,user_id" }
    );

    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }

    setStatus(next);
    setBusy(false);

    window.location.href = window.location.pathname;
  }

  const label =
    status === "going"
      ? "YOU ARE IN"
      : status === "not_going"
      ? "YOU ARE OUT"
      : "NO RESPONSE YET";

  const color =
    status === "going"
      ? "green"
      : status === "not_going"
      ? "red"
      : "#475569";

  return (
    <div style={{ marginTop: 10 }}>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          disabled={busy || isLocked}
          onClick={() => setRSVP("going")}
          style={{
            padding: "8px 12px",
            borderRadius: 12,
            border: "1px solid rgba(15,23,42,0.15)",
            background:
              status === "going" ? "rgba(16,185,129,0.18)" : "white",
            fontWeight: 900,
            cursor: busy || isLocked ? "not-allowed" : "pointer",
          }}
        >
          IN
        </button>

        <button
          disabled={busy || isLocked}
          onClick={() => setRSVP("not_going")}
          style={{
            padding: "8px 12px",
            borderRadius: 12,
            border: "1px solid rgba(15,23,42,0.15)",
            background:
              status === "not_going" ? "rgba(239,68,68,0.15)" : "white",
            fontWeight: 900,
            cursor: busy || isLocked ? "not-allowed" : "pointer",
          }}
        >
          OUT
        </button>

        <span
          style={{
            marginLeft: 6,
            fontSize: 13,
            fontWeight: 800,
            color,
          }}
        >
          {isLocked ? "LOCKED" : label}
        </span>
      </div>

      {err && (
        <div style={{ marginTop: 8, fontSize: 13, color: "#b91c1c" }}>
          {err}
        </div>
      )}
    </div>
  );
}