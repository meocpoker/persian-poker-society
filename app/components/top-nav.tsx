"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";


type GroupRow = { id: string; name: string; slug: string };
type MembershipRow = { role: string; status: string };

export default function TopNav({ groupSlug }: { groupSlug: string }) {
  
  const supabase = createClient();
  
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function load() {
      setIsAdmin(false);

      // 1) Who is logged in?
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;

      setEmail(user?.email ?? null);

      if (!user) return;

      // 2) Find group id from slug
      const { data: group, error: gErr } = await supabase
        .from("groups")
        .select("id,name,slug")
        .eq("slug", groupSlug)
        .maybeSingle();

      if (gErr || !group) return;

      // 3) Check membership for admin role + approved status
      const { data: membership, error: mErr } = await supabase
        .from("group_members")
        .select("role,status")
        .eq("group_id", (group as GroupRow).id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (mErr || !membership) return;

      const mem = membership as MembershipRow;
      setIsAdmin(mem.role === "admin" && mem.status === "approved");
    }

    load();

    // Keep nav updated if auth changes (logout/login)
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [groupSlug]);

  return (
    <div className="nav">
      <div style={{ display: "flex", gap: 18 }}>
        <Link href={`/g/${groupSlug}`}>Dashboard</Link>
        <Link href={`/g/${groupSlug}/members`}>Members</Link>
        {isAdmin && <Link href={`/admin/${groupSlug}`}>Admin</Link>}
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <span style={{ fontSize: 14 }}>
          {email ? `Logged in as: ${email}` : "Not logged in"}
        </span>

        <button
          className="button"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/login";
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

