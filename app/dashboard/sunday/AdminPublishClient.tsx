"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminPublishClient({
  eventId,
  currentStatus,
}: {
  eventId: string;
  currentStatus: string;
}) {
  const supabase = createClient();
  const [busy, setBusy] = useState(false);

  const published = currentStatus === "published";

  async function updateStatus(nextStatus: "draft" | "published") {
    if (busy) return;
    setBusy(true);

    const { error } = await supabase
      .from("events")
      .update({ status: nextStatus })
      .eq("id", eventId);

    setBusy(false);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button
        type="button"
        disabled={busy || published}
        onClick={() => updateStatus("published")}
        style={{
          padding: "10px 14px",
          borderRadius: 14,
          border: "1px solid #1F7A63",
          background: published ? "#EDF7F4" : "#1F7A63",
          color: published ? "#1F7A63" : "#FFFDF8",
          fontWeight: 900,
          fontSize: 13,
          cursor: busy || published ? "not-allowed" : "pointer",
          opacity: busy ? 0.7 : 1,
        }}
      >
        {published ? "Published" : "Publish Event"}
      </button>

      <button
        type="button"
        disabled={busy || !published}
        onClick={() => updateStatus("draft")}
        style={{
          padding: "10px 14px",
          borderRadius: 14,
          border: "1px solid #D9D3C7",
          background: !published ? "#F8F3EA" : "#FFFCF7",
          color: "#17342D",
          fontWeight: 900,
          fontSize: 13,
          cursor: busy || !published ? "not-allowed" : "pointer",
          opacity: busy ? 0.7 : 1,
        }}
      >
        Move to Draft
      </button>
    </div>
  );
}