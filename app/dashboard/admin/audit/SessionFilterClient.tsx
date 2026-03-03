"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function SessionFilterClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const [value, setValue] = useState(sp.get("session") ?? "");

  function apply() {
    const next = new URLSearchParams(sp.toString());

    const v = value.trim();
    if (v) next.set("session", v);
    else next.delete("session");

    router.push(`/dashboard/admin/audit?${next.toString()}`);
  }

  function clear() {
    const next = new URLSearchParams(sp.toString());
    next.delete("session");
    setValue("");
    router.push(`/dashboard/admin/audit?${next.toString()}`);
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Paste session UUID…"
        style={{
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid rgba(15,23,42,0.2)",
          minWidth: 320,
        }}
      />
      <button
        onClick={apply}
        style={{
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid rgba(15,23,42,0.2)",
          background: "#0b1220",
          color: "white",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        Apply
      </button>
      <button
        onClick={clear}
        style={{
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid rgba(15,23,42,0.2)",
          background: "#f8fafc",
          color: "#0f172a",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        Clear
      </button>
    </div>
  );
}