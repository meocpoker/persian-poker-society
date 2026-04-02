"use client";

import { useState } from "react";

type GroupKey = "doostaneh" | "sunday" | "friday";

const GROUP_LABELS: Record<GroupKey, string> = {
  doostaneh: "Doostaneh • دوستانه",
  sunday: "Sunday Poker • پوکر یکشنبه",
  friday: "Friday • جمعه",
};

export default function JoinGroupClient({
  userId,
  fullName,
  email,
  joinableGroups,
}: {
  userId: string;
  fullName: string;
  email: string;
  joinableGroups: GroupKey[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<GroupKey>>(new Set());
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function toggle(g: GroupKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(g) ? next.delete(g) : next.add(g);
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.size === 0) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/register/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          fullName,
          email,
          groups: Array.from(selected),
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Failed to submit request.");
      }

      setSuccessMsg("Request submitted. Pending admin approval.");
      setOpen(false);
      setSelected(new Set());
    } catch (err: any) {
      setErrorMsg(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        border: "1px solid #E3E0D8",
        borderRadius: 20,
        padding: 18,
        background: "#FFFCF7",
        boxShadow: "0 10px 30px rgba(31, 42, 55, 0.05)",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 900, color: "#17342D" }}>
        Join Another Group
      </div>
      <div style={{ fontSize: 14, color: "#5F6B66", marginTop: 6 }}>
        Want to join another group?
      </div>

      {successMsg && (
        <div
          style={{
            marginTop: 14,
            padding: "10px 12px",
            borderRadius: 12,
            background: "rgba(16,185,129,0.10)",
            border: "1px solid rgba(16,185,129,0.22)",
            color: "#065f46",
            fontSize: 13,
          }}
        >
          {successMsg}
        </div>
      )}

      {!open && !successMsg && (
        <button
          onClick={() => setOpen(true)}
          style={{
            marginTop: 14,
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid #1F7A63",
            background: "#1F7A63",
            color: "#FFFDF8",
            fontWeight: 900,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Request to Join
        </button>
      )}

      {open && (
        <form onSubmit={onSubmit} style={{ marginTop: 14 }}>
          <div style={{ display: "grid", gap: 10 }}>
            {joinableGroups.map((g) => (
              <label
                key={g}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: 12,
                  borderRadius: 10,
                  border: selected.has(g)
                    ? "1px solid #10b981"
                    : "1px solid rgba(148,163,184,0.6)",
                  background: selected.has(g)
                    ? "rgba(16,185,129,0.05)"
                    : "#ffffff",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#0f172a",
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.has(g)}
                  onChange={() => toggle(g)}
                  style={{ accentColor: "#0f766e" }}
                />
                {GROUP_LABELS[g]}
              </label>
            ))}
          </div>

          {errorMsg && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                borderRadius: 12,
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.20)",
                color: "#991b1b",
                fontSize: 13,
              }}
            >
              {errorMsg}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button
              type="submit"
              disabled={loading || selected.size === 0}
              style={{
                padding: "12px 16px",
                borderRadius: 14,
                border: "1px solid #1F7A63",
                background: "#1F7A63",
                color: "#FFFDF8",
                fontWeight: 900,
                fontSize: 14,
                cursor: loading || selected.size === 0 ? "not-allowed" : "pointer",
                opacity: loading || selected.size === 0 ? 0.7 : 1,
              }}
            >
              {loading ? "Submitting..." : "Submit Request"}
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setSelected(new Set());
                setErrorMsg(null);
              }}
              disabled={loading}
              style={{
                padding: "12px 16px",
                borderRadius: 14,
                border: "1px solid #D6D3CB",
                background: "#FFFFFF",
                color: "#17342D",
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
