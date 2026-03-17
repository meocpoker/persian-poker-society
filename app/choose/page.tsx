"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageShell from "@/app/components/ui/PageShell";
import SectionCard from "@/app/components/ui/SectionCard";
import PrimaryButton from "@/app/components/ui/PrimaryButton";

type ApprovedGroup = "doostaneh" | "sunday";

export default function ChoosePage() {
  const router = useRouter();
  const [approved, setApproved] = useState<ApprovedGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/memberships", { cache: "no-store" });
      if (!res.ok) {
        setError("Not authenticated.");
        return;
      }

      const json = await res.json();
      const list: ApprovedGroup[] = (json.memberships || [])
        .filter((m: any) => m.status === "approved")
        .map((m: any) => m.group_key);

      const unique = Array.from(new Set(list)) as ApprovedGroup[];

      if (unique.length === 1) {
        router.replace(
          unique[0] === "doostaneh"
            ? "/dashboard/doostaneh"
            : "/dashboard/sunday"
        );
        return;
      }

      setApproved(unique);
    })();
  }, [router]);

  if (error) {
    return (
      <PageShell
        eyebrow="Persian Men Society"
        title="Choose Dashboard"
        description="Select the group dashboard you want to open."
      >
        <SectionCard title="Error">
          <div style={{ color: "#8B1E2D" }}>{error}</div>
        </SectionCard>
      </PageShell>
    );
  }

  if (!approved) {
    return (
      <PageShell
        eyebrow="Persian Men Society"
        title="Choose Dashboard"
        description="Select the group dashboard you want to open."
      >
        <SectionCard title="Loading">
          <div style={{ color: "#6A746F" }}>Loading...</div>
        </SectionCard>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Persian Men Society"
      title="Choose Dashboard"
      description="You are approved for multiple groups. Choose where you want to go."
    >
      <SectionCard title="Available Dashboards">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {approved.includes("doostaneh") && (
            <PrimaryButton onClick={() => router.push("/dashboard/doostaneh")}>
              Doostaneh Dashboard
            </PrimaryButton>
          )}

          {approved.includes("sunday") && (
            <PrimaryButton onClick={() => router.push("/dashboard/sunday")} variant="gold">
              Sunday Poker Dashboard
            </PrimaryButton>
          )}
        </div>
      </SectionCard>
    </PageShell>
  );
}