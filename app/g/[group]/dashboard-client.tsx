"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";

import TopNav from "../../components/top-nav";

export default function DashboardClient({ slug }: { slug: string }) {

  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState<string>(slug);
  const [status, setStatus] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;

      if (!user) {
        setStatus("not_logged_in");
        setLoading(false);
        return;
      }

      const { data: group } = await supabase
        .from("groups")
        .select("id,name")
        .eq("slug", slug)
        .maybeSingle();

      if (!group) {
        setStatus("group_not_found");
        setLoading(false);
        return;
      }

      setGroupName(group.name);

      const { data: membership } = await supabase
        .from("group_members")
        .select("status, role")
        .eq("group_id", group.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership) {
        setStatus("not_a_member");
        setLoading(false);
        return;
      }

      setStatus(membership.status);
      setRole(membership.role);
      setLoading(false);
    }

    load();
  }, [slug]);

  if (loading) return <main style={{ padding: 40 }}>Loading...</main>;

  if (status !== "approved") {
    return (
      <main style={{ padding: 40 }}>
        <h1 className="h1">Access Restricted</h1>
        <p className="h2">
          {status === "not_logged_in"
            ? "Please log in."
            : status === "group_not_found"
            ? "Group not found."
            : status === "not_a_member"
            ? "You are not a member of this group."
            : "Pending approval from an admin."}
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: 40 }}>
      <TopNav groupSlug={slug} />

      <div className="card">
        <h1 className="h1">Dashboard</h1>

        <p className="h2">
          Group: <b>{groupName}</b>
        </p>

        <p>
          Role: <span className="badge">{role}</span>
        </p>
      </div>
    </main>
  );
}


