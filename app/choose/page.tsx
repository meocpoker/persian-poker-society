import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageShell from "@/app/components/ui/PageShell";
import SectionCard from "@/app/components/ui/SectionCard";
import PrimaryButton from "@/app/components/ui/PrimaryButton";

type ApprovedGroup = "doostaneh" | "sunday";

function isAdminEmail(email: string | null | undefined) {
  const e = String(email ?? "").toLowerCase().trim();
  return [
    "kazar@qats.com",
    "sp90@comcast.net",
    "sanjar@meoc.net",
    "farshid.mostowfi@gmail.com",
  ].includes(e);
}

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

  if (approved.length === 1) {
    redirect(
      approved[0] === "doostaneh"
        ? "/dashboard/doostaneh"
        : "/dashboard/sunday"
    );
  }

  const showAdmin = isAdminEmail(user.email);

  return (
    <PageShell
      eyebrow="Persian Men Society"
      title="Choose Dashboard"
      description="You are approved for multiple groups. Choose where you want to go."
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

          {showAdmin && (
            <Link
              href="/admin"
              style={{
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
            </Link>
          )}
        </div>
      </SectionCard>
    </PageShell>
  );
}