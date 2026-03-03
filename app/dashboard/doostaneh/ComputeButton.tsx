'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client'; // adjust path if needed

type Lifecycle = {
  session_id: string;
  group_key: string;
  status: 'draft' | 'active' | 'locked' | 'computed' | 'archived';
  role: 'admin' | 'master' | null;
  is_admin: boolean;
  already_computed: boolean;
  can_lock: boolean;
  can_unlock: boolean;
  can_compute: boolean;
};

export default function ComputeButton({
  sessionId,
  groupKey = 'doostaneh',
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

    const { data, error } = await supabase.rpc('admin_session_lifecycle', {
      p_session_id: sessionId,
    });

    if (error) {
      setErr(error.message);
      setLife(null);
      return;
    }

    // Supabase returns an array for table-returning functions
    const row = Array.isArray(data) ? data[0] : data;

    if (!row) {
      setErr('No lifecycle data returned for this session.');
      setLife(null);
      return;
    }

    // Guard against accidentally using a session from a different group
    if (row.group_key !== groupKey) {
      setErr(`Session group mismatch: expected ${groupKey}, got ${row.group_key}`);
      setLife(null);
      return;
    }

    setLife(row as Lifecycle);
  }

  useEffect(() => {
    console.log("Calling lifecycle for:", sessionId);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, groupKey]);

  async function doAction(
    fnName: 'admin_lock_session' | 'admin_unlock_session' | 'admin_compute_payout'
  ) {
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

  if (!life) {
    return (
      <div className="rounded-lg border p-3">
        <div className="text-sm text-gray-600">Session actions</div>

        {err ? (
          <div className="mt-2 text-sm text-red-600">{err}</div>
        ) : (
          <div className="mt-2 text-sm text-gray-500">Loading…</div>
        )}

        <button
          className="mt-3 rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
          onClick={refresh}
          disabled={busy}
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Session actions</div>
          <div className="text-xs text-gray-600">
            status: <span className="font-mono">{life.status}</span> · role:{' '}
            <span className="font-mono">{life.role ?? 'none'}</span>
          </div>
        </div>

        <button
          className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
          onClick={refresh}
          disabled={busy}
        >
          Refresh
        </button>
      </div>

      {err && <div className="mt-2 text-sm text-red-600">{err}</div>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
          disabled={busy || !life.can_lock}
          onClick={() => doAction('admin_lock_session')}
          title={!life.can_lock ? 'Only admins can lock active sessions' : ''}
        >
          Lock
        </button>

        <button
          className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
          disabled={busy || !life.can_unlock}
          onClick={() => doAction('admin_unlock_session')}
          title={!life.can_unlock ? 'Only admins can unlock locked (not computed) sessions' : ''}
        >
          Unlock
        </button>

        <button
          className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
          disabled={busy || !life.can_compute}
          onClick={() => doAction('admin_compute_payout')}
          title={!life.can_compute ? 'Must be locked and not already computed' : ''}
        >
          Compute payout
        </button>
      </div>
    </div>
  );
}
