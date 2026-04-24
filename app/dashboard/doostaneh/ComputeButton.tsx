"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Lifecycle = {
  session_id: string;
  group_key: string;
  status: "draft" | "active" | "locked" | "computed" | "archived";
  role: "admin" | "master" | null;
  is_admin: boolean;
  already_computed: boolean;
  can_lock: boolean;
  can_unlock: boolean;
  can_compute: boolean;
};

export type ComputePreviewData = {
  totalCollected: number;
  charity: number;
  prizePool: number;
  payoutLabel: string;
  winners: { place: number; name: string }[];
  wasAlreadyComputed: boolean;
};

function money(n: number) {
  return `$${Number(n || 0).toFixed(2)}`;
}

const placeEmoji = ["🥇", "🥈", "🥉", "4️⃣"];

export default function ComputeButton({
  sessionId,
  groupKey = "doostaneh",
  onChanged,
  previewData,
}: {
  sessionId: string;
  groupKey?: string;
  onChanged?: () => void;
  previewData?: ComputePreviewData;
}) {
  const supabase = createClient();

  const [life, setLife] = useState<Lifecycle | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  async function refresh() {
    setErr(null);
    const { data, error } = await supabase.rpc("admin_session_lifecycle", {
      p_session_id: sessionId,
    });
    if (error) {
      setErr(error.message);
      setLife(null);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      setErr("No lifecycle data returned for this session.");
      setLife(null);
      return;
    }
    if (row.group_key !== groupKey) {
      setErr(`Session group mismatch: expected ${groupKey}, got ${row.group_key}`);
      setLife(null);
      return;
    }
    setLife(row as Lifecycle);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, groupKey]);

  async function doAction(fnName: "admin_lock_session" | "admin_unlock_session") {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.rpc(fnName, { p_session_id: sessionId });
    if (error) {
      setErr(error.message);
      setBusy(false);
      await refresh();
      return;
    }
    await refresh();
    setBusy(false);
    onChanged?.();
  }

  async function doCompute() {
    setShowConfirmModal(false);
    setBusy(true);
    setErr(null);

    const wasAlreadyComputed =
      previewData?.wasAlreadyComputed ?? life?.already_computed ?? false;

    const { error } = await supabase.rpc("compute_doostaneh_tournament", {
      p_session_id: sessionId,
    });

    if (error) {
      setErr(error.message);
      setBusy(false);
      await refresh();
      return;
    }

    // Fire-and-forget: email all players with appropriate subject
    try {
      await fetch(`/api/doostaneh/sessions/${sessionId}/email-results`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ updated: wasAlreadyComputed }),
      });
    } catch {}

    await refresh();
    setBusy(false);
    onChanged?.();
  }

  const baseButton: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 14,
    border: "1px solid #D9D3C7",
    background: "#FFFDF8",
    color: "#17342D",
    transition: "all 0.15s ease",
  };

  if (!life) {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        {err ? (
          <div
            style={{
              fontSize: 13,
              color: "#8B1E2D",
              fontWeight: 700,
              background: "#FDF0F2",
              border: "1px solid #E9C8CF",
              borderRadius: 12,
              padding: 12,
            }}
          >
            {err}
          </div>
        ) : (
          <div
            style={{
              fontSize: 13,
              color: "#5F6B66",
              background: "#F8F3EA",
              border: "1px solid #E3E0D8",
              borderRadius: 12,
              padding: 12,
            }}
          >
            Loading session actions…
          </div>
        )}
        <button style={baseButton} onClick={refresh} disabled={busy} aria-disabled={busy}>
          Refresh
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Compute confirmation modal */}
      {showConfirmModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              background: "#FFFCF7",
              borderRadius: 20,
              padding: 28,
              maxWidth: 440,
              width: "100%",
              border: "1px solid #E3E0D8",
              boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 900, color: "#17342D", marginBottom: 16 }}>
              Confirm Payout Computation
            </div>

            {previewData ? (
              <>
                {/* Financials */}
                <div style={{ display: "grid", gap: 8, marginBottom: 18 }}>
                  {[
                    { label: "Total Collected", value: money(previewData.totalCollected) },
                    { label: "Charity",          value: money(previewData.charity) },
                    { label: "Prize Pool",        value: money(previewData.prizePool) },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: 10,
                        background: "#F8F3EA",
                        border: "1px solid #E3E0D8",
                      }}
                    >
                      <span style={{ fontSize: 13, color: "#6A746F", fontWeight: 700 }}>{label}</span>
                      <span style={{ fontSize: 13, color: "#17342D", fontWeight: 900 }}>{value}</span>
                    </div>
                  ))}
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      background: "#F8F3EA",
                      border: "1px solid #E3E0D8",
                      fontSize: 13,
                      color: "#6A746F",
                      fontWeight: 700,
                    }}
                  >
                    Split:{" "}
                    <span style={{ color: "#17342D", fontWeight: 900 }}>
                      {previewData.payoutLabel}
                    </span>
                  </div>
                </div>

                {/* Winners */}
                {previewData.winners.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#6A746F",
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                        marginBottom: 8,
                      }}
                    >
                      Winners
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {previewData.winners.map((w) => (
                        <div
                          key={w.place}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "8px 12px",
                            borderRadius: 10,
                            background: "#FBF6EA",
                            border: "1px solid #E5D2A1",
                          }}
                        >
                          <span style={{ fontSize: 16 }}>
                            {placeEmoji[w.place - 1] ?? `${w.place}.`}
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 900, color: "#17342D" }}>
                            {w.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 14, color: "#4E5B55", marginBottom: 20, lineHeight: 1.6 }}>
                Compute payouts for session{" "}
                <code style={{ fontSize: 12 }}>{sessionId.slice(0, 8)}</code>? This will post
                payouts to the ledger.
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{
                  padding: "10px 18px",
                  borderRadius: 12,
                  border: "1px solid #D9D3C7",
                  background: "#FFFFFF",
                  color: "#17342D",
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={doCompute}
                style={{
                  padding: "10px 18px",
                  borderRadius: 12,
                  border: "1px solid #1F7A63",
                  background: "#1F7A63",
                  color: "#FFFDF8",
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Compute Payouts
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {err && (
          <div
            style={{
              fontSize: 13,
              color: "#8B1E2D",
              fontWeight: 700,
              background: "#FDF0F2",
              border: "1px solid #E9C8CF",
              borderRadius: 12,
              padding: 12,
            }}
          >
            {err}
          </div>
        )}

        {life.can_lock && (
          <button
            style={{
              ...baseButton,
              border: "1px solid #C89B3C",
              background: "#FBF6EA",
              color: "#7A5B17",
            }}
            disabled={busy}
            aria-disabled={busy}
            onClick={() => doAction("admin_lock_session")}
          >
            Lock Session
          </button>
        )}

        {life.can_unlock && (
          <button
            style={{
              ...baseButton,
              border: "1px solid #8B1E2D",
              background: "#FFF3F4",
              color: "#8B1E2D",
            }}
            disabled={busy}
            aria-disabled={busy}
            onClick={() => doAction("admin_unlock_session")}
          >
            Unlock Session
          </button>
        )}

        {(life.can_compute || (life.is_admin && life.already_computed)) && (
          <button
            style={{
              ...baseButton,
              border: "1px solid #1F7A63",
              background: "#1F7A63",
              color: "#FFFDF8",
              boxShadow: "0 10px 24px rgba(31, 122, 99, 0.18)",
            }}
            disabled={busy}
            aria-disabled={busy}
            onClick={() => setShowConfirmModal(true)}
          >
            {busy ? "Computing…" : "Compute Payouts"}
          </button>
        )}

        {!life.can_lock && !life.can_unlock && !life.can_compute && !(life.is_admin && life.already_computed) && (
          <div
            style={{
              fontSize: 13,
              color: "#5F6B66",
              background: "#F8F3EA",
              border: "1px solid #E3E0D8",
              borderRadius: 12,
              padding: 12,
            }}
          >
            No actions available for this session.
          </div>
        )}
      </div>
    </>
  );
}
