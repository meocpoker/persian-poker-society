"use client";

import { useEffect, useState } from "react";

type PendingRow = {
  id: string;
  user_id: string;
  group_key: "doostaneh" | "sunday";
  status: "pending" | "approved" | "rejected";
  created_at: string;
  profiles?: { email: string | null; full_name: string | null } | null;
};

export default function AdminPanelClient() {
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMsg(null);

    const res = await fetch("/api/admin/memberships");
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMsg(json?.error || "Failed to load");
      setLoading(false);
      return;
    }

    setRows(json.pending || []);
    setLoading(false);
  }

  async function setStatus(membershipId: string, status: "approved" | "rejected") {
    setMsg(null);

    const res = await fetch("/api/admin/memberships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId, status }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(json?.error || "Update failed");
      return;
    }

    setRows((prev) => prev.filter((r) => r.id !== membershipId));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ marginTop: 18 }}>
      <style>{`
        .card {
          background: white;
          border: 1px solid rgba(15,23,42,0.10);
          border-radius: 14px;
          padding: 14px;
          box-shadow: 0 10px 25px rgba(15,23,42,0.06);
          margin-bottom: 10px;
        }
        .rowTop { display:flex; justify-content:space-between; gap: 12px; flex-wrap: wrap; }
        .email { font-weight: 800; color: #0f172a; }
        .meta { color:#475569; font-size: 13px; margin-top: 4px; }
        .pill { font-size: 12px; font-weight: 800; padding: 6px 10px; border-radius: 999px; border: 1px solid rgba(15,23,42,0.10); }
        .actions { display:flex; gap: 8px; margin-top: 10px; }
        .btn {
          padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(15,23,42,0.12);
          cursor: pointer; font-weight: 800; background: white;
        }
        .approve { border-color: rgba(16,185,129,0.35); }
        .reject { border-color: rgba(239,68,68,0.35); }
        .msg { margin-top: 12px; padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(15,23,42,0.12); background: rgba(2,6,23,0.02); }
      `}</style>

      {loading && <div className="msg">Loading…</div>}

      {!loading && rows.length === 0 && (
        <div className="msg">No pending requests right now.</div>
      )}

      {msg && <div className="msg">{msg}</div>}

      {rows.map((r) => (
        <div className="card" key={r.id}>
          <div className="rowTop">
            <div>
              <div className="email">{r.profiles?.email || "(no email yet)"}</div>
              <div className="meta">
                Group: <b>{r.group_key}</b> • Requested:{" "}
                {new Date(r.created_at).toLocaleString()}
              </div>
              <div className="meta">User ID: {r.user_id}</div>
            </div>

            <div className="pill">PENDING</div>
          </div>

          <div className="actions">
            <button className="btn approve" onClick={() => setStatus(r.id, "approved")}>
              Approve
            </button>
            <button className="btn reject" onClick={() => setStatus(r.id, "rejected")}>
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
