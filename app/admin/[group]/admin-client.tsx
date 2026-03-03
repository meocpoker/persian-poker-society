"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";


type MemberRow = {
  user_id: string;
  group_id: string;
  role: string;
  status: string;
  created_at: string;
};

export default function AdminGroupClient({ slug }: { slug: string }) {

  const supabase = createClient();   // ✅ ADD THIS LINE

  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [pending, setPending] = useState<MemberRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);


  async function load() {
    setErrorMsg(null);

    // 1) Find group by slug
    const { data: group, error: gErr } = await supabase
      .from("groups")
      .select("id,name,slug")
      .eq("slug", slug)
      .maybeSingle();

    if (gErr) {
      setErrorMsg(gErr.message);
      return;
    }
    if (!group) {
      setErrorMsg(`Group not found for slug: ${slug}`);
      return;
    }

    setGroupId(group.id);
    setGroupName(group.name);

    // 2) Fetch pending memberships
    const { data: members, error: mErr } = await supabase
      .from("group_members")
      .select("user_id,group_id,role,status,created_at")
      .eq("group_id", group.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (mErr) {
      setErrorMsg(mErr.message);
      setPending([]);
      return;
    }

    setPending((members ?? []) as MemberRow[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function approve(userId: string) {
    if (!groupId) return;

    setBusyUserId(userId);
    setErrorMsg(null);

    const { error } = await supabase
      .from("group_members")
      .update({ status: "approved" })
      .eq("group_id", groupId)
      .eq("user_id", userId);

    setBusyUserId(null);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    // refresh list
    await load();
  }

  return (
    <main style={{ padding: 40, maxWidth: 980 }}>
      <h1 style={{ fontSize: 44, marginBottom: 10 }}>Admin</h1>

      <p style={{ fontSize: 20, marginBottom: 24 }}>
        Group: <b>{groupName ?? slug}</b>
      </p>

      {errorMsg && (
        <p style={{ color: "crimson", fontSize: 18 }}>Error: {errorMsg}</p>
      )}

      <h2 style={{ fontSize: 28, marginTop: 24 }}>Pending approvals</h2>

      {pending.length === 0 ? (
        <p style={{ marginTop: 12 }}>No pending members.</p>
      ) : (
        <table
          style={{
            marginTop: 12,
            borderCollapse: "collapse",
            width: "100%",
          }}
        >
          <thead>
            <tr>
              <th style={{ padding: 10, borderBottom: "1px solid #ddd", textAlign: "left" }}>
                User ID
              </th>
              <th style={{ padding: 10, borderBottom: "1px solid #ddd", textAlign: "left" }}>
                Role
              </th>
              <th style={{ padding: 10, borderBottom: "1px solid #ddd", textAlign: "left" }}>
                Status
              </th>
              <th style={{ padding: 10, borderBottom: "1px solid #ddd", textAlign: "left" }}>
                Created
              </th>
              <th style={{ padding: 10, borderBottom: "1px solid #ddd", textAlign: "left" }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {pending.map((m) => (
              <tr key={`${m.user_id}-${m.group_id}`}>
                <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{m.user_id}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{m.role}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{m.status}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                  {new Date(m.created_at).toLocaleString()}
                </td>
                <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                  <button
                    onClick={() => approve(m.user_id)}
                    disabled={busyUserId === m.user_id}
                    style={{
                      padding: "8px 12px",
                      fontSize: 16,
                      cursor: busyUserId === m.user_id ? "not-allowed" : "pointer",
                    }}
                  >
                    {busyUserId === m.user_id ? "Approving..." : "Approve"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

