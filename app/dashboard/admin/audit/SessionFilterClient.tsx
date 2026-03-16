"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function SessionFilterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");

  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString());

    if (from) params.set("from", from);
    else params.delete("from");

    if (to) params.set("to", to);
    else params.delete("to");

    params.delete("page");

    router.push(`/dashboard/admin/audit?${params.toString()}`);
  }

  function clearFilters() {
    router.push("/dashboard/admin/audit");
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "flex-end",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#6A746F",
            marginBottom: 6,
          }}
        >
          From
        </div>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #D9D3C7",
            background: "#FFFCF7",
            color: "#17342D",
            minWidth: 170,
            fontSize: 14,
          }}
        />
      </div>

      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#6A746F",
            marginBottom: 6,
          }}
        >
          To
        </div>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #D9D3C7",
            background: "#FFFCF7",
            color: "#17342D",
            minWidth: 170,
            fontSize: 14,
          }}
        />
      </div>

      <button
        type="button"
        onClick={applyFilters}
        style={{
          padding: "10px 14px",
          borderRadius: 12,
          border: "1px solid #1F7A63",
          background: "#1F7A63",
          color: "#FFFDF8",
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        Apply
      </button>

      <button
        type="button"
        onClick={clearFilters}
        style={{
          padding: "10px 14px",
          borderRadius: 12,
          border: "1px solid #D9D3C7",
          background: "#F8F3EA",
          color: "#17342D",
          fontWeight: 900,
          cursor: "pointer",
        }}
      >
        Clear
      </button>
    </div>
  );
}