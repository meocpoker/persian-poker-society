"use client";

import { useEffect, useState } from "react";

export default function CardsToggleClient({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onOpenList(ev: Event) {
      setOpen(true);

      const custom = ev as CustomEvent<{ eventId?: string }>;
      const eventId = custom?.detail?.eventId;

      if (eventId) {
        setTimeout(() => {
          const el = document.getElementById(`event-${eventId}`);
          el?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
      }
    }

    window.addEventListener("pms:open-event-list", onOpenList);
    return () => window.removeEventListener("pms:open-event-list", onOpenList);
  }, []);

  return (
    <div style={{ marginTop: 18 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: "8px 12px",
          borderRadius: 12,
          border: "1px solid rgba(15,23,42,0.15)",
          background: "white",
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        {open ? "Hide event list" : "Show event list"}
      </button>

      {open && <div style={{ marginTop: 14 }}>{children}</div>}
    </div>
  );
}