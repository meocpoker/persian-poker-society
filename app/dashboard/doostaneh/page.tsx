import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/app/components/ui/PageShell";
import SectionCard from "@/app/components/ui/SectionCard";
import { createClient } from "@/lib/supabase/server";
import ComputeButton from "./ComputeButton";
import AdminActivity from "./AdminActivity";
import CreateTournamentButton from "./CreateTournamentButton";
import PokerStarsMapClient from "./PokerStarsMapClient";
import RecentSessionsClient from "./RecentSessionsClient";

export default async function DoostanehDashboard({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const params = await searchParams;
  const sessionId = params.session ?? null;

  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) redirect("/login");

  const { data: memberships, error: memErr } = await supabase
    .from("memberships")
    .select("group_key,status")
    .eq("user_id", user.id);

  if (memErr) redirect("/login");

  const approved = (memberships ?? [])
    .filter((m: any) => m.status === "approved")
    .map((m: any) => m.group_key);

  if (!approved.includes("doostaneh")) {
    if (approved.length === 1 && approved[0] === "sunday") redirect("/dashboard/sunday");
    if (approved.length >= 2) redirect("/choose");
    redirect("/login");
  }

  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("group_key", "doostaneh")
    .maybeSingle();

  const isAdmin = !!adminRow;

  let pendingCount = 0;

  if (isAdmin) {
    const { count } = await supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("group_key", "doostaneh");

    pendingCount = count || 0;
  }

  const { data: recentSessions } = await supabase
    .from("sessions")
    .select("id, tournament_number, external_game_id, starts_at, status")
    .eq("group_key", "doostaneh")
    .order("tournament_number", { ascending: false })
    .limit(200);

  return (
    <PageShell
      eyebrow="Persian Men Society"
      title="Doostaneh"
      description="Create a new tournament, then manage players, winners, and payout computation from the session page."
      actions={
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {isAdmin && (
            <Link
              href="/admin"
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "8px 12px",
                borderRadius: 999,
                background: "#111827",
                color: "#ffffff",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              Admin
              {pendingCount > 0 && (
                <span
                  style={{
                    marginLeft: 8,
                    background: "#DC2626",
                    color: "#ffffff",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "2px 6px",
                    lineHeight: 1,
                  }}
                >
                  {pendingCount}
                </span>
              )}
            </Link>
          )}

          {isAdmin && <CreateTournamentButton />}
<Link
  href="/dashboard/doostaneh/leaderboard"
  style={{
    border: "1px solid #D6D3CB",
    background: "#e9cece",
    color: "#17342D",
    borderRadius: 12,
    padding: "10px 14px",
    fontWeight: 800,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
  }}
>
  Leaderboard
</Link>
          <Link
            href="/dashboard/doostaneh/sessions"
            style={{
              border: "1px solid #D6D3CB",
              background: "#17342D",
              color: "#FFFFFF",
              borderRadius: 12,
              padding: "10px 14px",
              fontWeight: 800,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            View Sessions
          </Link>

          <Link
            href="/dashboard"
            style={{ color: "#1F7A63", fontWeight: 800, textDecoration: "none" }}
          >
            ← Back to Dashboard
          </Link>

          <form action="/auth/logout" method="post" style={{ margin: 0 }}>
            <button
              type="submit"
              style={{
                border: "1px solid #D6D3CB",
                background: "#FFFFFF",
                color: "#17342D",
                borderRadius: 12,
                padding: "10px 14px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </form>
        </div>
      }
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
          subtitle="Open a session from the sessions page, audit log, or use the active session link."
        >
          <div style={{ marginBottom: 16 }}>
            <Link
              href="/dashboard/doostaneh/sessions"
              style={{
                border: "1px solid #D6D3CB",
                background: "#FFFFFF",
                color: "#17342D",
                borderRadius: 12,
                padding: "10px 14px",
                fontWeight: 800,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Open Sessions List
            </Link>
          </div>

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
                Create a new tournament above, or open a session from the Sessions List.
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
          title="Recent Sessions"
          subtitle="Open a historical or current session."
        >
          <RecentSessionsClient sessions={recentSessions ?? []} />
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

      {isAdmin && (
        <div style={{ marginTop: 20 }}>
          <SectionCard
            title="PokerStars Username Mapping"
            subtitle="Map each Doostaneh player to their PokerStars username."
          >
            <PokerStarsMapClient />
          </SectionCard>
        </div>
      )}
    </PageShell>
  );
}