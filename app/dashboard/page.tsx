import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardRootPage() {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) redirect("/login");

  // get approved memberships
  const { data } = await supabase
    .from("memberships")
    .select("group_key")
    .eq("user_id", user.id)
    .eq("status", "approved");

  const groups = (data || []).map((m) => m.group_key);

  if (groups.length === 0) {
    redirect("/choose");
  }

  if (groups.length === 1) {
    redirect(
      groups[0] === "doostaneh"
        ? "/dashboard/doostaneh"
        : "/dashboard/sunday"
    );
  }

  // multiple groups
  redirect("/choose");
}