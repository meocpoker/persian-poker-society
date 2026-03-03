"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function StartSessionClient({
  groupKey,
  startsAt,
}: {
  groupKey: "sunday" | "doostaneh";
  startsAt: string;
}) {
  const supabase = createClient();
  const [busy, setBusy] = useState(false);

  async function start(format: "cash" | "tournament") {
    if (busy) return;
    setBusy(true);

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      setBusy(false);
      alert("Not authenticated");
      return;
    }

    // 🔥 Explicitly create as ACTIVE
    const { error: insErr } = await supabase.from("sessions").insert({
      group_key: groupKey,
      format,
      starts_at: startsAt,
      created_by: user.id,
      status: "active",
    });

    if (insErr) {
      setBusy(false);
      alert(insErr.message);
      return;
    }

    const { data: s, error: selErr } = await supabase
      .from("sessions")
      .select("id")
      .eq("created_by", user.id)
      .eq("group_key", groupKey)
      .eq("starts_at", startsAt)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setBusy(false);

    if (selErr) {
      alert(selErr.message);
      return;
    }

    if (!s?.id) {
      alert("Session created, but app could not read it back (RLS).");
      return;
    }

    window.location.href = `/dashboard/${groupKey}/sessions/${s.id}`;
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button
        disabled={busy}
        onClick={() => start("cash")}
        style={{
          padding: "6px 10px",
          borderRadius: 10,
          border: "1px solid rgba(15,23,42,0.15)",
          background: "white",
          fontWeight: 800,
          fontSize: 12,
          cursor: busy ? "not-allowed" : "pointer",
        }}
      >
        Start Cash Session
      </button>

      <button
        disabled={busy}
        onClick={() => start("tournament")}
        style={{
          padding: "6px 10px",
          borderRadius: 10,
          border: "1px solid rgba(15,23,42,0.15)",
          background: "white",
          fontWeight: 800,
          fontSize: 12,
          cursor: busy ? "not-allowed" : "pointer",
        }}
      >
        Start Tournament Session
      </button>
    </div>
  );
}