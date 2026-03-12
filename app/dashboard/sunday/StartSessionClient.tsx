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
      alert("Session created, but app could not read it back.");
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
          padding: "10px 14px",
          borderRadius: 14,
          border: "1px solid #1F7A63",
          background: "#1F7A63",
          color: "#FFFDF8",
          fontWeight: 900,
          fontSize: 13,
          cursor: busy ? "not-allowed" : "pointer",
          opacity: busy ? 0.7 : 1,
        }}
      >
        Start Cash Session
      </button>

      <button
        disabled={busy}
        onClick={() => start("tournament")}
        style={{
          padding: "10px 14px",
          borderRadius: 14,
          border: "1px solid #C89B3C",
          background: "#C89B3C",
          color: "#FFFDF8",
          fontWeight: 900,
          fontSize: 13,
          cursor: busy ? "not-allowed" : "pointer",
          opacity: busy ? 0.7 : 1,
        }}
      >
        Start Tournament Session
      </button>
    </div>
  );
}