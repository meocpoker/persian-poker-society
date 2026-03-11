"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PageShell from "@/app/components/ui/PageShell";
import SectionCard from "@/app/components/ui/SectionCard";
import ComputeButton from "./ComputeButton";
import AdminActivity from "./AdminActivity";
import CreateTournamentButton from "./CreateTournamentButton";

function DoostanehDashboardInner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  return (
    <PageShell
      eyebrow="Persian Men Society"
      title="Doostaneh"
      description="Create a new tournament, then manage players, winners, and payout computation from the session page."
      actions={<CreateTournamentButton />}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: 20,
        }}
      >
        <SectionCard
          title="Session Actions"
          subtitle="Open a session from the audit log or use the active session link."
        >
          {sessionId ? (
            <>
              <div style={{ fontSize: 12, color: "#7A6F62", fontWeight: 700 }}>
                Selected session
              </div>

              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <code
                  style={{
                    padding: "8px 10px",
                    border: "1px solid #D9D3C7",
                    borderRadius: 10,
                    background: "#F6F1E8",
                    color: "#17342D",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {sessionId}
                </code>

                <Link
                  href={`/dashboard/doostaneh/sessions/${sessionId}`}
                  style={{
                    color: "#1F7A63",
                    fontWeight: 800,
                    textDecoration: "none",
                  }}
                >
                  Open session panel →
                </Link>
              </div>

              <div style={{ marginTop: 16 }}>
                <ComputeButton sessionId={sessionId} groupKey="doostaneh" />
              </div>
            </>
          ) : (
            <div
              style={{
                border: "1px dashed #D9D3C7",
                borderRadius: 14,
                padding: 16,
                background: "#FBF7EF",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 800, color: "#17342D" }}>
                No session selected
              </div>
              <div style={{ marginTop: 8, fontSize: 14, color: "#6E675D" }}>
                Create a new tournament above, or open a session from the Audit Log.
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Club Notes"
          subtitle="Doostaneh tournament rules currently in use."
        >
          <div style={{ display: "grid", gap: 10, fontSize: 14, color: "#4F5A55" }}>
            <div>Buy-in: $5</div>
            <div>Rebuys: 0 / 1 / 2</div>
            <div>Add-on: $5 once per player</div>
            <div>Charity: $10 under $80, otherwise $20</div>
            <div>Computation posts to ledger and audit log</div>
          </div>
        </SectionCard>
      </div>

      <div style={{ marginTop: 20 }}>
        <SectionCard
          title="Admin Activity"
          subtitle="Recent system actions for the Doostaneh group."
        >
          <AdminActivity groupKey="doostaneh" />
        </SectionCard>
      </div>
    </PageShell>
  );
}

export default function DoostanehDashboard() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
      <DoostanehDashboardInner />
    </Suspense>
  );
}