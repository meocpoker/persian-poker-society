import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  const adminGroups = adminRows
    .map((row) => row.group_key)
    .filter(Boolean);

  const groupLabel =
    adminGroups.length === 2
      ? "sunday + doostaneh"
      : adminGroups[0];

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>Admin • Approvals</h1>

      <p style={{ marginTop: 6, color: "#475569" }}>
        Review pending requests for: {groupLabel}
      </p>

      <AdminPanelClient />
    </div>
  );
}