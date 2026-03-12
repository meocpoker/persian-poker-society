"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SetHostClient({
  eventId,
  currentHostId,
  members,
}: {
  eventId: string;
  currentHostId: string | null;
  members: {
    user_id: string;
    full_name: string | null;
    email: string | null;
    _k: string;
  }[];
}) {
  const supabase = createClient();
  const [hostId, setHostId] = useState(currentHostId ?? "");
  const [busy, setBusy] = useState(false);

  async function saveHost() {
    if (busy) return;
    setBusy(true);

    const { error } = await supabase
      .from("events")
      .update({ host_user_id: hostId || null })
      .eq("id", eventId);

    setBusy(false);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <select
        value={hostId}
        onChange={(e) => setHostId(e.target.value)}
        disabled={busy}
        style={{
          minWidth: 240,
          padding: "10px 12px",
          borderRadius: 14,
          border: "1px solid #D9D3C7",
          background: "#F8F3EA",
          color: "#17342D",
          fontSize: 13,
          opacity: busy ? 0.7 : 1,
        }}
      >
        <option value="">No host selected</option>
        {members.map((m) => (
          <option key={m._k} value={m.user_id}>
            {m.full_name || m.email || m.user_id}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={saveHost}
        disabled={busy}
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
        {busy ? "Saving..." : "Set Host"}
      </button>
    </div>
  );
}