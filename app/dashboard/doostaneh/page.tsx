"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ComputeButton from "./ComputeButton";
import AdminActivity from "./AdminActivity";
import CreateTournamentButton from "./CreateTournamentButton";

function DoostanehDashboardInner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  return (
    <div style={{ padding: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700 }}>Doostaneh</div>
        <CreateTournamentButton />
      </div>

      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
        Create a new tournament, then manage players + winners inside the session page.
      </div>

      <div style={{ marginTop: 18, fontSize: 18, fontWeight: 800 }}>
        Lifecycle Panel
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
            No session selected. Create a new tournament above, or open a session from the Audit Log.
          </div>
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <AdminActivity groupKey="doostaneh" />
      </div>
    </div>
  );
}

export default function DoostanehDashboard() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
      <DoostanehDashboardInner />
    </Suspense>
  );
}