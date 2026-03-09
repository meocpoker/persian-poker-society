"use client";

import { useState } from "react";

export default function CreateTournamentButton() {
  const [open, setOpen] = useState(false);
  const [dt, setDt] = useState<string>(() => {
    // default to "now" in datetime-local format
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const y = now.getFullYear();
    const m = pad(now.getMonth() + 1);
    const d = pad(now.getDate());
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    return `${y}-${m}-${d}T${hh}:${mm}`;
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onCreate() {
    setErr(null);
    setBusy(true);
    try {
      // datetime-local -> ISO
      const startsAtIso = new Date(dt).toISOString();

      const res = await fetch("/api/doostaneh/tournaments/open", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ starts_at: startsAtIso }),
      });

      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "create_failed");

      const sessionId = json.session_id as string;
      window.location.href = `/dashboard/doostaneh/sessions/${sessionId}`;
    } catch (e: any) {
      setErr(e?.message || "create_failed");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #1f2937",
          background: "#0b1220",
          color: "white",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        + Create Doostaneh Tournament
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              borderRadius: 14,
              border: "1px solid #1f2937",
              background: "#0b1220",
              color: "white",
              padding: 16,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 10 }}>
              Create Doostaneh Tournament
            </div>

            <div style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 10 }}>
              Choose date/time (you can edit later).
            </div>

            <label style={{ display: "block", fontSize: 12, color: "#cbd5e1", marginBottom: 6 }}>
              Starts at
            </label>
            <input
              type="datetime-local"
              value={dt}
              onChange={(e) => setDt(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #334155",
                background: "#0f172a",
                color: "white",
              }}
            />

            {err && (
              <div style={{ marginTop: 10, color: "#fecaca", fontSize: 12 }}>
                Error: {err}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #334155",
                  background: "transparent",
                  color: "white",
                  fontWeight: 800,
                  cursor: "pointer",
                  opacity: busy ? 0.6 : 1,
                }}
              >
                Cancel
              </button>

              <button
                onClick={onCreate}
                disabled={busy}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #1f2937",
                  background: "#16a34a",
                  color: "white",
                  fontWeight: 900,
                  cursor: "pointer",
                  opacity: busy ? 0.6 : 1,
                }}
              >
                {busy ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}