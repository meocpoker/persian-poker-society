"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Member = {
  user_id: string;
  full_name: string | null;
  email: string | null;
};

export default function SetHostClient({
  eventId,
  currentHostId,
  members,
}: {
  eventId: string;
  currentHostId: string | null;
  members: Member[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hostId, setHostId] = useState<string>(currentHostId ?? "");

  async function save(nextHostId: string) {
    setBusy(true);
    setErr(null);

    const payload =
      nextHostId.trim().length === 0 ? { host_user_id: null } : { host_user_id: nextHostId };

    const { error } = await supabase
      .from("events")
      .update(payload)
      .eq("id", eventId);

    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }

    setBusy(false);
    window.location.reload();
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>Host for this event</div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
        <select
          value={hostId}
          disabled={busy}
          onChange={(e) => {
            const v = e.target.value;
            setHostId(v);
            save(v);
          }}
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid rgba(15,23,42,0.15)",
            background: "white",
            minWidth: 260,
            fontWeight: 700,
          }}
        >
          <option value="">(no host selected)</option>

          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {(m.full_name || m.email || m.user_id).toString()}
            </option>
          ))}
        </select>

        {busy && <span style={{ fontSize: 12, color: "#64748b" }}>Saving…</span>}
      </div>

      {err && (
        <div style={{ marginTop: 8, fontSize: 13, color: "#b91c1c" }}>
          {err}
        </div>
      )}
    </div>
  );
}