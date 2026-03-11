"use client";

import Link from "next/link";

type AuditItem = {
  id: string;
  action: string;
  created_at: string;
};

export default function AuditPreview({
  items,
  groupKey,
}: {
  items: AuditItem[];
  groupKey: "sunday" | "doostaneh";
}) {
  if (!items || items.length === 0) {
    return (
      <div
        style={{
          border: "1px dashed #D9D3C7",
          borderRadius: 14,
          padding: 16,
          background: "#FBF7EF",
          fontSize: 14,
          color: "#6E675D",
        }}
      >
        No recent activity.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {items.slice(0, 5).map((item) => (
        <div
          key={item.id}
          style={{
            border: "1px solid #E3E0D8",
            borderRadius: 12,
            padding: 12,
            background: "#FFFCF7",
            fontSize: 14,
          }}
        >
          <div style={{ fontWeight: 800, color: "#17342D" }}>
            {item.action}
          </div>

          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
            {new Date(item.created_at).toLocaleString()}
          </div>
        </div>
      ))}

      <div style={{ marginTop: 6 }}>
        <Link
          href={`/admin/audit?group=${groupKey}`}
          style={{
            fontWeight: 800,
            color: "#1F7A63",
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          View full audit log →
        </Link>
      </div>
    </div>
  );
}