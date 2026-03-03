"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../../lib/supabase/client";
import TopNav from "../../../components/top-nav";

type MemberRow = {
  user_id: string;
  role: string;
  created_at: string;
  profiles: { full_name: string | null }[]; // ✅ Supabase nested select returns an array
};

export default function MembersClient({ slug }: { slug: string }) {
  const supabase = createClient();

  const [groupName, setGroupName] = useState(slug);
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data: group } = await supabase
        .from("groups")
        .select("id,name")
        .eq("slug", slug)
        .maybeSingle();

      if (!group) {
        if (!cancelled) setLoading(false);
        return;
      }

      if (!cancelled) setGroupName(group.name);

      const { data, error } = await supabase
        .from("group_members")
        .select("user_id,role,created_at,profiles(full_name)")
        .eq("group_id", group.id)
        .eq("status", "approved")
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (error) {
        // fail closed: show empty list rather than type-unsafe data
       const normalized: MemberRow[] = (data ?? []).map((r: any) => ({
  user_id: r.user_id,
  role: r.role,
  created_at: r.created_at,
  profiles: Array.isArray(r.profiles) ? r.profiles : [],
}));

setRows(normalized);
        setLoading(false);
        return;
      }

      // ✅ Normalize shape defensively
      const normalized: MemberRow[] = (data ?? []).map((r: any) => ({
        user_id: r.user_id,
        role: r.role,
        created_at: r.created_at,
        profiles: Array.isArray(r.profiles) ? r.profiles : [],
      }));

      setRows(normalized);
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [slug, supabase]);

  if (loading) return <main style={{ padding: 40 }}>Loading...</main>;

  return (
    <main style={{ padding: 40 }}>
      <TopNav groupSlug={slug} />

      <div className="card">
        <h1 className="h1">Members</h1>
        <p className="h2">
          Group: <b>{groupName}</b>
        </p>

        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Since</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const name = r.profiles?.[0]?.full_name ?? r.user_id;

              return (
                <tr key={r.user_id}>
                  <td>{name}</td>
                  <td>
                    <span className="badge">{r.role}</span>
                  </td>
                  <td>{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
