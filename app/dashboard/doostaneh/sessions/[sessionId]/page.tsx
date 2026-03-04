// app/dashboard/doostaneh/sessions/[sessionId]/page.tsx
"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ComputeButton from "../../ComputeButton";
import AdminActivity from "../../AdminActivity";

function Badge({
  label,
}: {
  label: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid #334155",
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 0.2,
        background: "#0f172a",
        color: "#e2e8f0",
      }}
    >
      {label}
    </span>
  );
}

export default function DoostanehSessionPage() {
  const params = useParams();
  const sessionId = params?.sessionId as string;

  return (
    <div style={{ padding: 24, maxWidth: 920, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>
            Doostaneh Session
          </h1>

          <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Badge label={`Session: ${sessionId?.slice(0, 8) ?? ""}`} />
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Link
              href={`/dashboard/doostaneh?session=${sessionId}`}
              className="underline"
            >
              Back to Doostaneh
            </Link>

            <Link
              href={`/dashboard/admin/audit?session=${sessionId}`}
              className="underline"
            >
              View in Audit Log
            </Link>
          </div>
        </div>

        <div style={{ minWidth: 260, flex: "0 0 320px" }}>
          <div
            style={{
              border: "1px solid #1f2937",
              borderRadius: 14,
              padding: 14,
              background: "#0b1220",
              color: "white",
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Session Actions</div>
            <div style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 12 }}>
              Compute Doostaneh payouts.
            </div>

            <ComputeButton sessionId={sessionId} groupKey="doostaneh" />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <AdminActivity groupKey="doostaneh" />
      </div>
    </div>
  );
}