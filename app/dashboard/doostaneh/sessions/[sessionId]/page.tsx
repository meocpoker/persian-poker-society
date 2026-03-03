"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import ComputeButton from "../../ComputeButton";
import AdminActivity from "../../AdminActivity";

export default function DoostanehSessionPage() {
  const params = useParams();
  const sessionId = params?.sessionId as string;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            Doostaneh Session Control
          </div>

          <div style={{ marginTop: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.75 }}>Session:</span>{" "}
            <code
              style={{
                padding: "6px 8px",
                border: "1px solid #ddd",
                borderRadius: 6,
              }}
            >
              {sessionId}
            </code>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link
            href={`/dashboard/doostaneh?session=${sessionId}`}
            className="underline"
          >
            Back to doostaneh
          </Link>

          <Link
  href={`/dashboard/admin/audit?session=${sessionId}`}
  className="underline"
>
  View in Audit Log
</Link>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <ComputeButton sessionId={sessionId} groupKey="doostaneh" />
      </div>

      <div style={{ marginTop: 18 }}>
        <AdminActivity groupKey="doostaneh" />
      </div>
    </div>
  );
}