"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function CreateFridayEventClient() {
  const [eventDate, setEventDate] = useState("");
  const [busy, setBusy] = useState(false);

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!eventDate || busy) return;

    setBusy(true);

    const supabase = createClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      setBusy(false);
      alert("Not authenticated");
      return;
    }

    const res = await fetch("/dashboard/friday/events/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: user.id,
        event_date: eventDate,
      }),
    });

    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      alert(json?.error || "Failed to create Friday event.");
      return;
    }

    window.location.reload();
  }

  return (
    <form onSubmit={createEvent} style={{ display: "grid", gap: 10 }}>
      <div style={{ fontSize: 13, color: "#6A746F" }}>
        Create one Friday event, then publish it and start a cash session from it.
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          required
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #D6D3CB",
            background: "#FFFFFF",
            color: "#17342D",
            fontSize: 14,
          }}
        />

        <button
          type="submit"
          disabled={busy || !eventDate}
          style={{
            border: "1px solid #1F7A63",
            background: "#1F7A63",
            color: "#FFFFFF",
            borderRadius: 12,
            padding: "10px 14px",
            fontWeight: 800,
            cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? "Creating..." : "Create Friday Event"}
        </button>
      </div>
    </form>
  );
}