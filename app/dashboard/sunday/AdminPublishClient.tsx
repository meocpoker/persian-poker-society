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

  async function updateStatus(next: string) {
    if (busy) return;
    setBusy(true);

    const { error } = await supabase
      .from("events")
      .update({ status: next })
      .eq("id", eventId);

    setBusy(false);

    if (!error) {
      window.location.reload();
    } else {
      alert(error.message);
    }
  }

  let primaryLabel = "";
  let primaryAction = "";

  if (currentStatus === "draft") {
    primaryLabel = "Publish";
    primaryAction = "published";
  } else if (currentStatus === "published") {
    primaryLabel = "Lock";
    primaryAction = "scheduled";
  } else if (currentStatus === "scheduled") {
    primaryLabel = "Unlock";
    primaryAction = "published";
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      {primaryLabel && (
        <button
          disabled={busy}
          onClick={() => updateStatus(primaryAction)}
          style={{
            padding: "4px 10px",
            borderRadius: 8,
            border: "1px solid rgba(15,23,42,0.15)",
            background: "white",
            fontWeight: 700,
            fontSize: 12,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {primaryLabel}
        </button>
      )}

      {currentStatus !== "draft" && (
        <button
          disabled={busy}
          onClick={() => updateStatus("draft")}
          style={{
            padding: "4px 10px",
            borderRadius: 8,
            border: "1px solid rgba(15,23,42,0.15)",
            background: "#fef2f2",
            fontWeight: 700,
            fontSize: 12,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          Unpublish
        </button>
      )}
    </div>
  );
}