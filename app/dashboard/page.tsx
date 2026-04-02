import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageShell from "@/app/components/ui/PageShell";
import SectionCard from "@/app/components/ui/SectionCard";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import Badge from "@/app/components/ui/Badge";
import JoinGroupClient from "./JoinGroupClient";

type GroupKey = "sunday" | "doostaneh" | "friday";

export default async function DashboardRootPage() {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("memberships")
    .select("group_key")
    .eq("user_id", user.id)
    .eq("status", "approved");

  const groups = Array.from(
    new Set((memberships ?? []).map((m: any) => m.group_key))
  ) as GroupKey[];

  const { data: adminRows } = await supabase
    .from("admins")
    .select("group_key")
    .eq("user_id", user.id);

  const adminGroups = Array.from(
    new Set((adminRows ?? []).map((r: any) => r.group_key).filter(Boolean))
  ) as GroupKey[];

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const fullName = profileRow?.full_name ?? user.email ?? "";

  const { data: allMemberships } = await supabase
    .from("memberships")
    .select("group_key")
    .eq("user_id", user.id);

  const allGroupKeys = new Set((allMemberships ?? []).map((m: any) => m.group_key));
  const allThree: GroupKey[] = ["doostaneh", "sunday", "friday"];
  const joinableGroups = allThree.filter((g) => !allGroupKeys.has(g));

  let pendingCount = 0;

  if (adminGroups.length > 0) {
    const { count } = await supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .in("group_key", adminGroups);

    pendingCount = count || 0;
  }

  return (
    <PageShell
      eyebrow="Persian Men Society"
      title="Dashboard"
      description="Choose your group dashboard and access admin tools."
      actions={
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {groups.includes("sunday") && <Badge variant="gold">Sunday</Badge>}
          {groups.includes("friday") && <Badge variant="gold">Friday</Badge>}
          {groups.includes("doostaneh") && <Badge variant="green">Doostaneh</Badge>}

          {adminGroups.length > 0 && (
            <Link
              href="/admin"
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px 16px",
                borderRadius: 12,
                background: "#111827",
                color: "#ffffff",
                textDecoration: "none",
                fontSize: 14,
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
      <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {groups.includes("sunday") && (
          <SectionCard
            title="Sunday Poker"
            subtitle="Calendar, RSVPs, hosts, sessions, and settlement."
          >
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ fontSize: 14, color: "#5F6B66" }}>
                Access the Sunday dashboard, manage attendance, and run cash sessions.
              </div>
              <PrimaryButton href="/dashboard/sunday" variant="gold">
                Open Sunday Dashboard
              </PrimaryButton>
            </div>
          </SectionCard>
        )}

        {groups.includes("friday") && (
          <SectionCard
            title="Friday Poker"
            subtitle="Calendar, RSVPs, hosts, sessions, and settlement."
          >
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ fontSize: 14, color: "#5F6B66" }}>
                Access the Friday dashboard, manage attendance, and run cash sessions.
              </div>
              <PrimaryButton href="/dashboard/friday" variant="gold">
                Open Friday Dashboard
              </PrimaryButton>
            </div>
          </SectionCard>
        )}

        {groups.includes("doostaneh") && (
          <SectionCard
            title="Doostaneh"
            subtitle="Tournament sessions, players, winners, and payout flow."
          >
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ fontSize: 14, color: "#5F6B66" }}>
                Access the Doostaneh dashboard and manage tournament activity.
              </div>
              <PrimaryButton href="/dashboard/doostaneh">
                Open Doostaneh Dashboard
              </PrimaryButton>
            </div>
          </SectionCard>
        )}

        {adminGroups.length > 0 && (
          <SectionCard
            title="Admin"
            subtitle="Approve memberships and review pending access requests."
          >
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ fontSize: 14, color: "#5F6B66" }}>
                You have admin access for {adminGroups.join(" + ")}.
              </div>
              <Link
                href="/admin"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "12px 16px",
                  borderRadius: 14,
                  border: "1px solid #111827",
                  background: "#111827",
                  color: "#ffffff",
                  textDecoration: "none",
                  fontWeight: 900,
                }}
              >
                Open Admin
              </Link>
            </div>
          </SectionCard>
        )}

        {joinableGroups.length > 0 && (
          <JoinGroupClient
            userId={user.id}
            fullName={fullName}
            email={user.email ?? ""}
            joinableGroups={joinableGroups}
          />
        )}
      </div>
    </PageShell>
  );
}