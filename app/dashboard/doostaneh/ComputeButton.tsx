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

    // IMPORTANT: parameter name is session_id (not p_session_id) in your function
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

  const buttonBase: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 900,
    border: "1px solid #334155",
    background: "#0b1220",
    color: "white",
  };

  if (!life) {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        {err ? (
          <div style={{ fontSize: 13, color: "#fecaca" }}>{err}</div>
        ) : (
          <div style={{ fontSize: 13, color: "#cbd5e1" }}>Loading…</div>
        )}

        <button style={buttonBase} onClick={refresh} disabled={busy} aria-disabled={busy}>
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {err && <div style={{ fontSize: 13, color: "#fecaca" }}>{err}</div>}

      {life.can_lock && (
        <button
          style={buttonBase}
          disabled={busy}
          aria-disabled={busy}
          onClick={() => doAction("admin_lock_session")}
        >
          Lock session
        </button>
      )}

      {life.can_unlock && (
        <button
          style={{
            ...buttonBase,
            border: "1px solid #991b1b",
            background: "#3f0a0a",
          }}
          disabled={busy}
          aria-disabled={busy}
          onClick={() => doAction("admin_unlock_session")}
        >
          Unlock session
        </button>
      )}

      {life.can_compute && (
        <button
          style={{
            ...buttonBase,
            border: "1px solid #1d4ed8",
            background: "#0a1f44",
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
          Compute payouts
        </button>
      )}

      {!life.can_lock && !life.can_unlock && !life.can_compute && (
        <div style={{ fontSize: 13, color: "#cbd5e1" }}>No actions available.</div>
      )}
    </div>
  );
}