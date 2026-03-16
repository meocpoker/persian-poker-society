import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminPanelClient from "./AdminPanelClient";

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) redirect("/login");

  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!adminRow) redirect("/login");

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>Admin • Approvals</h1>

      <p style={{ marginTop: 6, color: "#475569" }}>
        Review pending requests and approve/reject.
      </p>

      <AdminPanelClient />
    </div>
  );
}