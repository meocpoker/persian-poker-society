"use client";

import { useState } from "react";

export default function EmailHostButton({
  eventId,
}: {
  eventId: string;
}) {
  const [busy, setBusy] = useState(false);

  async function sendEmail() {
    if (busy) return;
    setBusy(true);

    const res = await fetch("/api/sunday/email-host", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event_id: eventId }),
    });

    const json = await res.json().catch(() => null);

    setBusy(false);

    if (!res.ok) {
      alert(json?.error || "Failed to email host");
      return;
    }

    if (json?.mailto) {
      window.location.href = json.mailto;
      return;
    }

    alert("Host email prepared");
  }

  return (
    <button
      type="button"
      onClick={sendEmail}
      disabled={busy}
      style={{
        padding: "10px 14px",
        borderRadius: 14,
        border: "1px solid #C89B3C",
        background: "#C89B3C",
        color: "#FFFDF8",
        fontWeight: 900,
        fontSize: 13,
        cursor: busy ? "not-allowed" : "pointer",
        opacity: busy ? 0.7 : 1,
      }}
    >
      {busy ? "Sending..." : "Email Host"}
    </button>
  );
}