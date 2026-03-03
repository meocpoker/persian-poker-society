import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminPanelClient from "./AdminPanelClient";

function isAdminEmail(email: string | null | undefined) {
  const list = (process.env.PMS_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return !!email && list.includes(email.toLowerCase());
}

export default async function AdminPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  if (!user) redirect("/login");
  if (!isAdminEmail(user.email)) redirect("/login");

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
