"use client";

import { useState } from "react";

export default function CreateTournamentButton() {
  const [open, setOpen] = useState(false);
  const [dt, setDt] = useState<string>(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const y = now.getFullYear();
    const m = pad(now.getMonth() + 1);
    const d = pad(now.getDate());
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    return `${y}-${m}-${d}T${hh}:${mm}`;
  });
  const [gameNumber, setGameNumber] = useState("");
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function openDialog() {
    setOpen(true);
    setErr(null);
    setLoadingSuggestion(true);
    try {
      const res = await fetch("/api/doostaneh/tournaments/open");
      const json = await res.json().catch(() => ({}));
      if (json?.ok && json?.suggested != null) {
        setGameNumber(String(json.suggested));
      }
    } catch {}
    setLoadingSuggestion(false);
  }

  async function onCreate() {
    setErr(null);
    setBusy(true);

    try {
      const startsAtIso = new Date(dt).toISOString();
      const body: Record<string, any> = { starts_at: startsAtIso };
      const trimmed = gameNumber.trim();
      if (trimmed) body.game_number = trimmed;

      const res = await fetch("/api/doostaneh/tournaments/open", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
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
        onClick={openDialog}
        style={{
          padding: "12px 16px",
          borderRadius: 14,
          border: "1px solid #1F7A63",
          background: "#1F7A63",
          color: "#FFFDF8",
          fontWeight: 900,
          cursor: "pointer",
          boxShadow: "0 10px 24px rgba(31, 122, 99, 0.22)",
        }}
      >
        + Create Doostaneh Tournament
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(33, 29, 24, 0.38)",
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
              maxWidth: 560,
              borderRadius: 22,
              border: "1px solid #E3E0D8",
              background: "#FFFCF7",
              color: "#17342D",
              padding: 22,
              boxShadow: "0 24px 60px rgba(31, 42, 55, 0.12)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 1.1,
                textTransform: "uppercase",
                color: "#C89B3C",
              }}
            >
              New Tournament
            </div>

            <div style={{ fontSize: 24, fontWeight: 900, marginTop: 8 }}>
              Create Doostaneh Tournament
            </div>

            <div style={{ fontSize: 14, color: "#5F6B66", marginTop: 10 }}>
              Choose the session date and time. You can manage players and winners on the next screen.
            </div>

            <div style={{ marginTop: 18 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#5F6B66",
                  marginBottom: 8,
                }}
              >
                Starts at
              </label>

              <input
                type="datetime-local"
                value={dt}
                onChange={(e) => setDt(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid #D9D3C7",
                  background: "#F8F3EA",
                  color: "#17342D",
                  fontSize: 14,
                }}
              />
            </div>

            <div style={{ marginTop: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#5F6B66",
                  marginBottom: 8,
                }}
              >
                Game Number
              </label>

              <input
                type="number"
                value={gameNumber}
                onChange={(e) => setGameNumber(e.target.value)}
                disabled={loadingSuggestion || busy}
                placeholder={loadingSuggestion ? "Loading…" : "e.g. 846"}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid #D9D3C7",
                  background: "#F8F3EA",
                  color: "#17342D",
                  fontSize: 14,
                  opacity: loadingSuggestion ? 0.6 : 1,
                }}
              />
            </div>

            {err && (
              <div
                style={{
                  marginTop: 14,
                  color: "#8B1E2D",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Error: {err}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                marginTop: 22,
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                style={{
                  padding: "11px 14px",
                  borderRadius: 14,
                  border: "1px solid #D9D3C7",
                  background: "#FFFDF8",
                  color: "#4E5B55",
                  fontWeight: 800,
                  cursor: "pointer",
                  opacity: busy ? 0.6 : 1,
                }}
              >
                Cancel
              </button>

              <button
                onClick={onCreate}
                disabled={busy || loadingSuggestion}
                style={{
                  padding: "11px 16px",
                  borderRadius: 14,
                  border: "1px solid #1F7A63",
                  background: "#1F7A63",
                  color: "#FFFDF8",
                  fontWeight: 900,
                  cursor: "pointer",
                  opacity: busy || loadingSuggestion ? 0.6 : 1,
                }}
              >
                {busy ? "Creating..." : "Create Tournament"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
