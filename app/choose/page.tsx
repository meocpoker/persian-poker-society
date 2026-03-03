"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ApprovedGroup = "doostaneh" | "sunday";

export default function ChoosePage() {
  const router = useRouter();
  const [approved, setApproved] = useState<ApprovedGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/memberships");
      if (!res.ok) {
        setError("Not authenticated.");
        return;
      }
      const json = await res.json();
      const list: ApprovedGroup[] = (json.memberships || [])
        .filter((m: any) => m.status === "approved")
        .map((m: any) => m.group_key);

      if (list.length === 1) {
        router.push(list[0] === "doostaneh" ? "/dashboard/doostaneh" : "/dashboard/sunday");
        return;
      }
      setApproved(list);
    })();
  }, [router]);

  if (error) return <div style={{ padding: 24 }}>{error}</div>;
  if (!approved) return <div style={{ padding: 24 }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>Choose dashboard</h1>
      <p style={{ marginTop: 8, color: "#475569" }}>
        You’re approved for multiple games. Where do you want to go?
      </p>

      <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
        {approved.includes("doostaneh") && (
          <button
            onClick={() => router.push("/dashboard/doostaneh")}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid rgba(15,23,42,0.12)",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Doostaneh Dashboard
          </button>
        )}

        {approved.includes("sunday") && (
          <button
            onClick={() => router.push("/dashboard/sunday")}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid rgba(15,23,42,0.12)",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Sunday Poker Dashboard
          </button>
        )}
      </div>
    </div>
  );
}
