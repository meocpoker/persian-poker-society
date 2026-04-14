// app/dashboard/sunday/sessions/[sessionId]/page.tsx
import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import PayoutSummary from "./PayoutSummary";
import SundayAdminTableClient from "./SundayAdminTableClient";

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: "neutral" | "green" | "gold" | "red" | "blue";
}) {
  const tones: Record<string, React.CSSProperties> = {
    neutral: { border: "1px solid #D9D3C7", background: "#F8F3EA", color: "#4E5B55" },
    green:   { border: "1px solid #B9D7CF", background: "#EDF7F4", color: "#1F7A63" },
    gold:    { border: "1px solid #E5D2A1", background: "#FBF6EA", color: "#8A6A1F" },
    red:     { border: "1px solid #E9C8CF", background: "#FDF0F2", color: "#8B1E2D" },
    blue:    { border: "1px solid #BFD4F8", background: "#EEF4FF", color: "#1D4ED8" },
  };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "6px 12px", borderRadius: 999, fontSize: 12,
      fontWeight: 800, letterSpacing: 0.2, ...tones[tone],
    }}>
      {label}
    </span>
  );
}

export default async function SundaySessionPage(props: any) {
  const p = await Promise.resolve(props?.params);

  const sessionId =
    p?.sessionId ?? p?.sessionID ?? p?.id ??
    props?.sessionId ?? props?.id ?? null;

  if (!sessionId || typeof sessionId !== "string") {
    return (
      <div style={{ padding: 24 }}>
        <h1>Session</h1>
        <div style={{ color: "red" }}>Invalid sessionId</div>
      </div>
    );
  }

  const supabase = await createClient();
  const serviceSupabase = createServiceClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) redirect("/login");

  // Keep lifecycle RPC only for disabled/read-only state
  const { data: lifecycle, error } = await supabase
    .rpc("admin_session_lifecycle", { p_session_id: sessionId })
    .maybeSingle();

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Sunday Session</h1>
        <div style={{ color: "red" }}>{error.message}</div>
      </div>
    );
  }

  if (!lifecycle) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Session not found</h1>
      </div>
    );
  }

  const statusLower = String((lifecycle as any)?.status ?? "").toLowerCase();
  const isAlreadyComputed = Boolean((lifecycle as any)?.already_computed);
  const isLockedOrComputed =
    statusLower === "locked" || statusLower === "computed" || isAlreadyComputed;

  // ── Auto-populate players from RSVPs ────────────────────────────────────────
  // Step 1: Get session starts_at
  const { data: sessionRow } = await serviceSupabase
    .from("sessions")
    .select("starts_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionRow?.starts_at) {
    // Step 2: Find sunday group
    const { data: group } = await serviceSupabase
      .from("groups")
      .select("id")
      .eq("slug", "sunday")
      .maybeSingle();

    if (group) {
      // Step 3: Find associated event by matching starts_at to event_date
      const { data: event } = await serviceSupabase
        .from("events")
        .select("id")
        .eq("group_id", group.id)
        .eq("event_date", sessionRow.starts_at)
        .maybeSingle();

      if (event) {
        // Step 4: Get going RSVPs
        const { data: goingRsvps } = await serviceSupabase
          .from("rsvps")
          .select("user_id")
          .eq("event_id", event.id)
          .eq("status", "going");

        const goingUserIds = (goingRsvps ?? [])
          .map((r: any) => r.user_id)
          .filter(Boolean);

        if (goingUserIds.length > 0) {
          // Step 5: Resolve emails via profiles
          const { data: profileRows } = await serviceSupabase
            .from("profiles")
            .select("id, email")
            .in("id", goingUserIds);

          const emails = (profileRows ?? [])
            .map((p: any) => p.email)
            .filter(Boolean);

          if (emails.length > 0) {
            // Step 6: Resolve registry player ids via email
            const { data: registryRows } = await serviceSupabase
              .from("player_registry")
              .select("id")
              .in("email", emails);

            const registryIds = (registryRows ?? [])
              .map((r: any) => r.id)
              .filter(Boolean);

            if (registryIds.length > 0) {
              // Step 7: Get current session players
              const { data: currentPlayers } = await serviceSupabase
                .from("session_registry_players")
                .select("player_id")
                .eq("session_id", sessionId);

              const currentPlayerIds = new Set(
                (currentPlayers ?? []).map((r: any) => r.player_id)
              );

              // Step 8: Insert missing players (upsert to skip duplicates)
              const missing = registryIds.filter(
                (id: string) => !currentPlayerIds.has(id)
              );

              if (missing.length > 0) {
                await serviceSupabase
                  .from("session_registry_players")
                  .upsert(
                    missing.map((playerId: string) => ({
                      session_id: sessionId,
                      player_id: playerId,
                    })),
                    { onConflict: "session_id,player_id", ignoreDuplicates: true }
                  );
              }
            }
          }
        }
      }
    }
  }
  // ── End auto-populate ────────────────────────────────────────────────────────

  // Fetch session players (after auto-populate)
  const { data: sessionPlayersRaw, error: spErr } = await serviceSupabase
    .from("session_registry_players")
    .select("player_id")
    .eq("session_id", sessionId);

  if (spErr) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Sunday Session</h1>
        <div style={{ color: "red" }}>{spErr.message}</div>
      </div>
    );
  }

  const { data: entries, error: eErr } = await serviceSupabase
    .from("player_entries")
    .select("registry_player_id, type, amount_usd")
    .eq("session_id", sessionId);

  if (eErr) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Sunday Session</h1>
        <div style={{ color: "red" }}>{eErr.message}</div>
      </div>
    );
  }

  const sessionPlayerIds = (sessionPlayersRaw ?? [])
    .map((r: any) => r.player_id)
    .filter(Boolean);

  // Fetch player names
  const playersById = new Map<string, { id: string; full_name: string | null }>();

  if (sessionPlayerIds.length > 0) {
    const { data: playerRows } = await serviceSupabase
      .from("player_registry")
      .select("id, full_name")
      .in("id", sessionPlayerIds);

    (playerRows ?? []).forEach((p: any) => {
      playersById.set(p.id, { id: p.id, full_name: p.full_name ?? null });
    });
  }

  const entryMap = new Map<string, { buyin: number; cashout: number }>();

  sessionPlayerIds.forEach((pid: string) => {
    entryMap.set(pid, { buyin: 0, cashout: 0 });
  });

  (entries ?? []).forEach((e: any) => {
    const pid = e.registry_player_id;
    if (!pid) return;
    const row = entryMap.get(pid) ?? { buyin: 0, cashout: 0 };
    if (e.type === "buyin") row.buyin = Number(e.amount_usd || 0);
    if (e.type === "cashout") row.cashout = Number(e.amount_usd || 0);
    entryMap.set(pid, row);
  });

  const tableRows = sessionPlayerIds
    .map((id: string) => {
      const player = playersById.get(id);
      const amounts = entryMap.get(id) ?? { buyin: 0, cashout: 0 };
      return {
        playerId: id,
        fullName: player?.full_name ?? id,
        buyin: amounts.buyin,
        cashout: amounts.cashout,
      };
    })
    .sort((a, b) => String(a.fullName).localeCompare(String(b.fullName)));

  let statusTone: "neutral" | "green" | "gold" | "red" | "blue" = "neutral";
  if (statusLower === "active" || statusLower === "open") statusTone = "green";
  else if (statusLower === "locked") statusTone = "gold";
  else if (statusLower === "computed") statusTone = "blue";

  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      background: "linear-gradient(180deg, #FAF6EF 0%, #F7F1E7 100%)",
      padding: 24,
    }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>

        {/* Header */}
        <div style={{
          background: "#FFFCF7",
          border: "1px solid #E3E0D8",
          borderRadius: 24,
          padding: 24,
          marginBottom: 18,
          boxShadow: "0 16px 40px rgba(31, 42, 55, 0.06)",
        }}>
          <div style={{
            fontSize: 12, fontWeight: 800, letterSpacing: 1.1,
            textTransform: "uppercase", color: "#C89B3C",
          }}>
            Persian Men Society
          </div>

          <h1 style={{
            fontSize: 34, lineHeight: 1.1, fontWeight: 900,
            margin: "8px 0 0 0", color: "#17342D",
          }}>
            Sunday Session
          </h1>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Badge
              label={`Status: ${(lifecycle as any)?.status ?? "unknown"}`}
              tone={statusTone}
            />
            {(statusLower === "computed" || isAlreadyComputed) && (
              <Badge label="Settlement Ready" tone="blue" />
            )}
          </div>

          <div style={{ marginTop: 14 }}>
            <Link
              href="/dashboard/sunday"
              style={{ color: "#1F7A63", fontWeight: 800, textDecoration: "none" }}
            >
              ← Back to Sunday Dashboard
            </Link>
          </div>
        </div>

        <SundayAdminTableClient
          sessionId={sessionId}
          initialRows={tableRows}
          disabled={isLockedOrComputed}
        />

        <PayoutSummary
          sessionId={sessionId}
          status={String((lifecycle as any)?.status ?? "").toLowerCase()}
        />

      </div>
    </div>
  );
}
