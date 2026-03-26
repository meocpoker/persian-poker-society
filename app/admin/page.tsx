import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageShell from "@/app/components/ui/PageShell";
import SectionCard from "@/app/components/ui/SectionCard";
import Badge from "@/app/components/ui/Badge";
import AdminPanelClient from "./AdminPanelClient";

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) redirect("/login");

  const { data: adminRows } = await supabase
    .from("admins")
    .select("group_key")
    .eq("user_id", user.id);

  if (!adminRows || adminRows.length === 0) redirect("/login");

  const adminGroups = Array.from(
    new Set(adminRows.map((row) => row.group_key).filter(Boolean))
  );

  const groupLabel = adminGroups.join(" + ");

  let pendingCount = 0;

  const { count } = await supabase
    .from("memberships")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .in("group_key", adminGroups);

  pendingCount = count || 0;

  return (
    <PageShell
      eyebrow="Persian Men Society"
      title="Admin Approvals"
      description={`Review pending membership requests for: ${groupLabel}.`}
      actions={
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {adminGroups.includes("sunday") && <Badge variant="gold">Sunday Admin</Badge>}
          {adminGroups.includes("friday") && <Badge variant="gold">Friday Admin</Badge>}
          {adminGroups.includes("doostaneh") && <Badge variant="green">Doostaneh Admin</Badge>}
          <Badge variant="gray">{pendingCount} Pending</Badge>

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
      <SectionCard
        title="Pending Requests"
        subtitle="Approve or reject membership requests for your allowed groups only."
      >
        <AdminPanelClient />
      </SectionCard>
    </PageShell>
  );
}