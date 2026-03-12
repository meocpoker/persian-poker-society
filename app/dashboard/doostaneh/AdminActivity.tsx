"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminActivity({
  groupKey,
}: {
  groupKey: string;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch(
          `/api/admin/audit/export?group=${groupKey}&limit=5`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          if (active) {
            setRows([]);
            setLoading(false);
          }
          return;
        }

        const data = await res.json();

        if (active) {
          setRows(Array.isArray(data) ? data : data?.rows ?? []);
          setLoading(false);
        }
      } catch {
        if (active) {
          setRows([]);
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [groupKey]);

  if (loading) {
    return <div style={{ color: "#5F6B66", fontSize: 14 }}>Loading...</div>;
  }

  if (!rows.length) {
    return <div style={{ color: "#5F6B66", fontSize: 14 }}>No recent activity.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {rows.slice(0, 5).map((row: any, idx: number) => (
        <div
          key={row.id ?? idx}
          style={{
            border: "1px solid #E3E0D8",
            borderRadius: 12,
            padding: 12,
            background: "#FFFCF7",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontWeight: 900, color: "#17342D" }}>
              {row.group_key} · {row.action}
            </div>

            <div style={{ fontSize: 12, color: "#64748b" }}>
              {row.created_at
                ? new Date(row.created_at).toLocaleString()
                : ""}
            </div>
          </div>

          {row.status ? (
            <div style={{ marginTop: 6, fontSize: 13, color: "#17342D" }}>
              <span style={{ color: "#64748b" }}>Status:</span> {row.status}
            </div>
          ) : null}

          {row.message ? (
            <div style={{ marginTop: 6, fontSize: 13, color: "#17342D" }}>
              {row.message}
            </div>
          ) : null}
        </div>
      ))}

      <div style={{ marginTop: 4 }}>
        <Link
          href={`/dashboard/admin/audit?group=${groupKey}`}
          style={{
            color: "#1F7A63",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          View full audit log →
        </Link>
      </div>
    </div>
  );
}