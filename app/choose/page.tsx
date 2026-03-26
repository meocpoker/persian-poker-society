import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageShell from "@/app/components/ui/PageShell";
import SectionCard from "@/app/components/ui/SectionCard";
import PrimaryButton from "@/app/components/ui/PrimaryButton";

type ApprovedGroup = "doostaneh" | "sunday" | "friday";

export default async function ChoosePage() {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) redirect("/login");

  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("group_key,status")
    .eq("user_id", user.id)
    .eq("status", "approved");

  if (error) {
    return (
      <PageShell
        eyebrow="Persian Men Society"
        title="Choose Dashboard"
        description="Select where you want to go."
      >
        <SectionCard title="Error">
          <div style={{ color: "#8B1E2D" }}>{error.message}</div>
        </SectionCard>
      </PageShell>
    );
  }

  const approved = Array.from(
    new Set((memberships ?? []).map((m: any) => m.group_key))
  ) as ApprovedGroup[];

  const { data: adminRows } = await supabase
    .from("admins")
    .select("group_key")
    .eq("user_id", user.id);

  const adminGroups = Array.from(
    new Set((adminRows ?? []).map((row: any) => row.group_key).filter(Boolean))
  ) as ApprovedGroup[];

  const showAdmin = adminGroups.length > 0;

  if (approved.length === 0) {
    return (
      <PageShell
        eyebrow="Persian Men Society"
        title="Choose Dashboard"
        description="Select where you want to go."
      >
        <SectionCard title="Not Approved">
          <div style={{ color: "#6A746F" }}>
            Your account is not approved for any game yet. Please wait for admin approval.
          </div>
        </SectionCard>
      </PageShell>
    );
  }

  if (approved.length === 1 && !showAdmin) {
    redirect(
      approved[0] === "doostaneh"
        ? "/dashboard/doostaneh"
        : approved[0] === "sunday"
        ? "/dashboard/sunday"
        : "/dashboard/friday"
    );
  }

  let pendingCount = 0;

  if (showAdmin) {
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
      title="Choose Dashboard"
      description="Choose where you want to go."
    >
      <SectionCard title="Available Dashboards">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {approved.includes("doostaneh") && (
            <PrimaryButton href="/dashboard/doostaneh">
              Doostaneh Dashboard
            </PrimaryButton>
          )}

          {approved.includes("sunday") && (
            <PrimaryButton href="/dashboard/sunday" variant="gold">
              Sunday Poker Dashboard
            </PrimaryButton>
          )}

          {approved.includes("friday") && (
            <PrimaryButton href="/dashboard/friday" variant="gold">
              Friday Poker Dashboard
            </PrimaryButton>
          )}

          {showAdmin && (
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
                    position: "absolute",
                    top: -6,
                    right: -8,
                    background: "#DC2626",
                    color: "white",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "2px 6px",
                  }}
                >
                  {pendingCount}
                </span>
              )}
            </Link>
          )}
        </div>
      </SectionCard>
    </PageShell>
  );
}