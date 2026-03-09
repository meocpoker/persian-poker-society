"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ComputeButton from "./ComputeButton";
import AdminActivity from "./AdminActivity";
import CreateTournamentButton from "./CreateTournamentButton";

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#FFFCF7",
        border: "1px solid #E3E0D8",
        borderRadius: 20,
        padding: 20,
        boxShadow: "0 10px 30px rgba(31, 42, 55, 0.05)",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 800, color: "#17342D" }}>{title}</div>
      {subtitle ? (
        <div style={{ fontSize: 13, color: "#5F6B66", marginTop: 6 }}>{subtitle}</div>
      ) : null}
      <div style={{ marginTop: 16 }}>{children}</div>
    </div>
  );
}

function DoostanehDashboardInner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  return (
    <div
      style={{
        minHeight: "100%",
        background:
          "linear-gradient(180deg, #FAF6EF 0%, #F7F1E7 100%)",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div
          style={{
            background: "#FFFCF7",
            border: "1px solid #E3E0D8",
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 16px 40px rgba(31, 42, 55, 0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  color: "#1F7A63",
                }}
              >
                Persian Men Society
              </div>

              <div
                style={{
                  fontSize: 34,
                  lineHeight: 1.1,
                  fontWeight: 900,
                  color: "#17342D",
                  marginTop: 8,
                }}
              >
                Doostaneh
              </div>

              <div
                style={{
                  fontSize: 15,
                  color: "#5F6B66",
                  marginTop: 10,
                  maxWidth: 720,
                }}
              >
                Create a new tournament, then manage players, winners, and payout
                computation from the session page.
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              <CreateTournamentButton />
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 20,
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