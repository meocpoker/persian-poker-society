"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminActivity({
  actions,
  groupKey,
}: {
  actions?: any[];
  groupKey: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? actions ?? [] : (actions ?? []).slice(0, 5);

  return (
    <div>
      {(!actions || actions.length === 0) && (
        <div style={{ color: "#475569" }}>No activity yet.</div>
      )}

      {visible.map((a: any, i: number) => (
        <div
          key={i}
          style={{
            padding: "8px 0",
            borderBottom: "1px solid #eee",
            fontSize: 14,
            color: "#000000",
          }}
        >
          <div style={{ fontWeight: 700 }}>
            {a.action}
          </div>

          <div style={{ fontSize: 12, color: "#475569" }}>
            {new Date(a.created_at).toLocaleString()}
          </div>

          {a.message && (
            <div style={{ fontSize: 13, marginTop: 2 }}>
              {a.message}
            </div>
          )}
        </div>
      ))}

      {(actions?.length ?? 0) > 5 && (
        <div style={{ marginTop: 12 }}>
          {!expanded ? (
            <button
              onClick={() => setExpanded(true)}
              style={{
                fontWeight: 700,
                color: "#1F7A63",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Show more activity →
            </button>
          ) : (
            <button
              onClick={() => setExpanded(false)}
              style={{
                fontWeight: 700,
                color: "#1F7A63",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Collapse ↑
            </button>
          )}
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <Link
          href={`/dashboard/admin/audit?group=${groupKey}`}
          style={{
            fontWeight: 800,
            color: "#1F7A63",
            textDecoration: "none",
          }}
        >
          View full audit log →
        </Link>
      </div>
    </div>
  );
}