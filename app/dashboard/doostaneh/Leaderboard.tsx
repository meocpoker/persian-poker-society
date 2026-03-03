'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Row = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  balance_usd: number;
  rank_position: number;
};

export default function Leaderboard() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase.rpc(
      'get_group_leaderboard',
      { p_group_key: 'doostaneh' }
    );

    if (error) {
      setError(error.message);
      return;
    }

    setRows(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="rounded-lg border p-4 mt-6">
      <h2 className="text-lg font-semibold mb-3">Leaderboard</h2>

      {error && (
        <div className="text-red-600 text-sm mb-2">
          {error}
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-1">Rank</th>
            <th className="text-left py-1">Name</th>
            <th className="text-left py-1">Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.user_id} className="border-b">
              <td className="py-1">{r.rank_position}</td>
              <td className="py-1">
                {r.full_name ?? r.email ?? r.user_id}
              </td>
              <td className="py-1 font-mono">
                ${Number(r.balance_usd).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
