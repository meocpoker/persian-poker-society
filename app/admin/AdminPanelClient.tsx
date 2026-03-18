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
  const [busyId, setBusyId] = useState<string | null>(null);

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
    if (busyId) return;

    setBusyId(membershipId);
    setMsg(null);

    const res = await fetch("/api/admin/memberships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId, status }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setMsg(json?.error || "Update failed");
      setBusyId(null);
      return;
    }

    setRows((prev) => prev.filter((r) => r.id !== membershipId));
    setBusyId(null);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ marginTop: 4 }}>
      <style>{`
        .card {
          background: #FFFFFF;
          border: 1px solid #E3E0D8;
          border-radius: 18px;
          padding: 16px;
          box-shadow: 0 10px 25px rgba(31,42,55,0.05);
          margin-bottom: 12px;
        }
        .rowTop {
          display:flex;
          justify-content:space-between;
          gap: 12px;
          flex-wrap: wrap;
          align-items:flex-start;
        }
        .name {
          font-weight: 900;
          color: #17342D;
          font-size: 16px;
        }
        .email {
          font-weight: 700;
          color: #3F4C46;
          margin-top: 3px;
        }
        .meta {
          color:#6A746F;
          font-size: 13px;
          margin-top: 6px;
        }
        .pill {
          font-size: 12px;
          font-weight: 900;
          padding: 7px 11px;
          border-radius: 999px;
          border: 1px solid #E5D2A1;
          background: #FBF6EA;
          color: #8A6A1F;
        }
        .groupPill {
          display:inline-flex;
          align-items:center;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
          margin-top: 8px;
        }
        .groupSunday {
          background: #FBF6EA;
          border: 1px solid #E5D2A1;
          color: #8A6A1F;
        }
        .groupDoostaneh {
          background: #EDF7F4;
          border: 1px solid #B9D7CF;
          color: #1F7A63;
        }
        .actions {
          display:flex;
          gap: 8px;
          margin-top: 14px;
          flex-wrap: wrap;
        }
        .btn {
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid transparent;
          cursor: pointer;
          font-weight: 900;
          font-size: 13px;
        }
        .approve {
          border-color: #B9D7CF;
          background: #EDF7F4;
          color: #1F7A63;
        }
        .reject {
          border-color: #E9C8CF;
          background: #FDF0F2;
          color: #8B1E2D;
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .msg {
          margin-top: 4px;
          margin-bottom: 12px;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid #E3E0D8;
          background: #F8F3EA;
          color: #4F5A55;
          font-size: 14px;
          font-weight: 700;
        }
      `}</style>

      {loading && <div className="msg">Loading pending requests…</div>}

      {!loading && rows.length === 0 && (
        <div className="msg">No pending requests right now.</div>
      )}

      {msg && <div className="msg">{msg}</div>}

      {rows.map((r) => {
        const isBusy = busyId === r.id;
        const name = r.profiles?.full_name || "Unnamed member";
        const email = r.profiles?.email || "(no email yet)";
        const isSunday = r.group_key === "sunday";

        return (
          <div className="card" key={r.id}>
            <div className="rowTop">
              <div>
                <div className="name">{name}</div>
                <div className="email">{email}</div>

                <div
                  className={`groupPill ${isSunday ? "groupSunday" : "groupDoostaneh"}`}
                >
                  {isSunday ? "Sunday" : "Doostaneh"}
                </div>

                <div className="meta">
                  Requested: {new Date(r.created_at).toLocaleString()}
                </div>
                <div className="meta">User ID: {r.user_id}</div>
              </div>

              <div className="pill">PENDING</div>
            </div>

            <div className="actions">
              <button
                className="btn approve"
                disabled={isBusy}
                onClick={() => setStatus(r.id, "approved")}
              >
                {isBusy ? "Working..." : "Approve"}
              </button>

              <button
                className="btn reject"
                disabled={isBusy}
                onClick={() => setStatus(r.id, "rejected")}
              >
                {isBusy ? "Working..." : "Reject"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}