"use client";

import { useState } from "react";

export default function CardsToggleClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: "10px 14px",
          borderRadius: 14,
          border: "1px solid #1F7A63",
          background: open ? "#1F7A63" : "#FFFCF7",
          color: open ? "#FFFDF8" : "#1F7A63",
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        {open ? "Hide Event List" : "Show Event List"}
      </button>

      {open ? <div style={{ marginTop: 16 }}>{children}</div> : null}
    </div>
  );
}