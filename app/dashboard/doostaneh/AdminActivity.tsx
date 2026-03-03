'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client'; // adjust if your path differs

type AdminLogRow = {
  id: number;
  created_at: string;
  actor_user_id: string;
  group_key: string;
  session_id: string | null;
  action: string;
  status: string;
  message: string | null;
  meta: any;
};

export default function AdminActivity({ groupKey }: { groupKey: string }) {
  const supabase = createClient();
  const [rows, setRows] = useState<AdminLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    const { data, error } = await supabase.rpc(
      'admin_group_action_feed',
      {
        p_group_key: groupKey,
        p_limit: 50,
        p_before: null,
      }
    );

    if (!error && data) {
      setRows(data as AdminLogRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mt-8 rounded-xl border p-4">
      <h2 className="text-lg font-semibold mb-3">
        Admin Activity
      </h2>

      {loading && <p className="text-sm text-gray-500">Loading...</p>}

      {!loading && rows.length === 0 && (
        <p className="text-sm text-gray-500">
          No admin activity yet.
        </p>
      )}

      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded bg-gray-50 p-3">
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                {new Date(r.created_at).toLocaleString()}
              </span>
              <span
                className={`px-2 py-0.5 rounded ${
                  r.status === 'ok'
                    ? 'bg-green-100'
                    : 'bg-red-100'
                }`}
              >
                {r.status}
              </span>
            </div>

            <div className="mt-1 text-sm font-medium">
              {r.action}
            </div>

            {r.message && (
              <div className="text-sm">{r.message}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
