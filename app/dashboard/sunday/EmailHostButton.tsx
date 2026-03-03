"use client";

import { useState } from "react";

export default function EmailHostButton({ eventId }: { eventId: string }) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      style={{
        marginTop: 12,
        padding: "8px 14px",
        borderRadius: 10,
        border: "1px solid rgba(15,23,42,0.15)",
        fontWeight: 700,
        cursor: "pointer",
        background: "white",
        opacity: busy ? 0.7 : 1,
      }}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await fetch("/api/sunday/email-host", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event_id: eventId }),
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            alert(data?.error || "Request failed");
            return;
          }

          if (data?.mailto) {
            window.location.href = data.mailto;
          } else {
            alert(data?.error || "No mailto returned");
          }
        } finally {
          setBusy(false);
        }
      }}
    >
      Email Host
    </button>
  );
}