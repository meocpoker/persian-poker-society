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

export default function ComputeButton({
  sessionId,
  groupKey = "doostaneh",
  onChanged,
}: {
  sessionId: string;
  groupKey?: string;
  onChanged?: () => void;
}) {
  const supabase = createClient();

  const [life, setLife] = useState<Lifecycle | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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

      {life.can_compute && (
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
          onClick={async () => {
            const ok = window.confirm(
              `Compute payouts for this session?\n\nSession: ${sessionId}\n\nThis will post payouts to the ledger. Continue?`
            );
            if (!ok) return;

            setBusy(true);
            setErr(null);

            const { error } = await supabase.rpc("compute_doostaneh_tournament", {
              p_session_id: sessionId,
            });

            if (error) {
              setErr(error.message);
              setBusy(false);
              await refresh();
              return;
            }

            await refresh();
            setBusy(false);
            onChanged?.();
          }}
        >
          Compute Payouts
        </button>
      )}

      {!life.can_lock && !life.can_unlock && !life.can_compute && (
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
  );
}