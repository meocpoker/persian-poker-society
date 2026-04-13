"use client";

import { useState } from "react";

type MissingPlayer = {
  name: string;
  missing: string;
};

export default function CloseEventClient({ eventId }: { eventId: string }) {
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState<MissingPlayer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function validate() {
    setBusy(true);
    setMissing(null);
    setError(null);

    const res = await fetch("/api/sunday/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId }),
    });

    const json = await res.json();
    setBusy(false);

    if (!res.ok) {
      setError(json.error ?? "Something went wrong");
      return;
    }

    if (json.ok === false && json.missing) {
      setMissing(json.missing);
      return;
    }

    setSuccess(true);
    setTimeout(() => window.location.reload(), 600);
  }

  if (success) {
    return (
      <div style={{ color: "#1F7A63", fontWeight: 800, fontSize: 13 }}>
        Event closed and payout computed. Refreshing...
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div>
        <button
          type="button"
          onClick={validate}
          disabled={busy}
          style={{
            padding: "9px 14px",
            borderRadius: 12,
            border: "1px solid #8B1E2D",
            background: busy ? "#F8F3EA" : "#FDF0F2",
            color: "#8B1E2D",
            fontWeight: 900,
            fontSize: 13,
            cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? "Validating..." : "Validate & Close Event"}
        </button>
      </div>

      {error && (
        <div style={{ color: "#8B1E2D", fontSize: 13, fontWeight: 700 }}>{error}</div>
      )}

      {missing && missing.length > 0 && (
        <div
          style={{
            border: "1px solid #F5C6CB",
            background: "#FDF0F2",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 800, color: "#8B1E2D", marginBottom: 8 }}>
            Cannot close — missing entries:
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            {missing.map((p, i) => (
              <div key={i} style={{ fontSize: 13, color: "#17342D" }}>
                <span style={{ fontWeight: 700 }}>{p.name}</span>
                <span style={{ color: "#8B1E2D" }}> — missing {p.missing}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
