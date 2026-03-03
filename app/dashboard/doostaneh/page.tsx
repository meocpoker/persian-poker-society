"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ComputeButton from "./ComputeButton";
import AdminActivity from "./AdminActivity";

export default function DoostanehDashboard() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  return (
    <div style={{ padding: 20 }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
        Doostaneh Lifecycle Panel
      </div>

      {sessionId ? (
        <>
          <div style={{ marginTop: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              Session from Audit Link:
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                marginTop: 4,
                flexWrap: "wrap",
              }}
            >
              <code
                style={{
                  padding: "6px 8px",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                }}
              >
                {sessionId}
              </code>

              <Link
  href={`/dashboard/doostaneh/sessions/${sessionId}`}
  className="underline"
>
  Open session panel
</Link>
            </div>
          </div>

          <ComputeButton sessionId={sessionId} groupKey="doostaneh" />
        </>
      ) : (
        <div className="rounded-lg border p-3">
          <div className="text-sm font-semibold">Session actions</div>
          <div className="mt-2 text-sm text-gray-600">
            No session selected. Open a session from the Audit Log.
          </div>
        </div>
      )}

      <div style={{ marginTop: 18 }}>
       <AdminActivity groupKey="doostaneh" />
      </div>
    </div>
  );
}