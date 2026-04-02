"use client";

import { useState } from "react";

export default function DeleteEventClient({ eventId }: { eventId: string }) {
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!window.confirm("Delete this event? This cannot be undone.")) return;
    setBusy(true);

    const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(json?.error || "Failed to delete event.");
      setBusy(false);
      return;
    }

    window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      style={{
        padding: "10px 14px",
        borderRadius: 14,
        border: "1px solid #8B1E2D",
        background: "#FFF3F4",
        color: "#8B1E2D",
        fontWeight: 900,
        fontSize: 13,
        cursor: busy ? "not-allowed" : "pointer",
        opacity: busy ? 0.7 : 1,
      }}
    >
      {busy ? "Deleting..." : "Delete Event"}
    </button>
  );
}
