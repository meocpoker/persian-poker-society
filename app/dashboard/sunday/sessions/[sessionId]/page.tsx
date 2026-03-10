// app/dashboard/sunday/sessions/[sessionId]/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConfirmSubmitButton from "./ConfirmSubmitButton";
import PayoutSummary from "./PayoutSummary";
import SundayAdminTableClient from "./SundayAdminTableClient";

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "yellow" | "blue" | "gray" | "red";
}) {
  const tones: Record<typeof tone, React.CSSProperties> = {
    green: { background: "#052e16", borderColor: "#14532d", color: "#bbf7d0" },
    yellow: { background: "#3a2a03", borderColor: "#854d0e", color: "#fde68a" },
    blue: { background: "#0a1f44", borderColor: "#1d4ed8", color: "#bfdbfe" },
    gray: { background: "#0f172a", borderColor: "#334155", color: "#e2e8f0" },
    red: { background: "#3f0a0a", borderColor: "#991b1b", color: "#fecaca" },
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid",
        fontSize: 12,
        fontWeight: 800,
        ...tones[tone],
      }}
    >
      {label}
    </span>
  );
}

function PrimaryButton({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant?: "default" | "danger";
}) {
  const danger = variant === "danger";
  return (
    <button
      type="submit"
      style={{
        width: "100%",
        padding: "12px 14px",
        borderRadius: 12,
        border: `1px solid ${danger ? "#991b1b" : "#334155"}`,
        background: danger ? "#3f0a0a" : "#0b1220",
        color: "white",
        cursor: "pointer",
        fontWeight: 900,
      }}
    >
      {children}
    </button>
  );
}

export default async function SundaySessionPage(props: any) {
  const p = await Promise.resolve(props?.params);

  const sessionId =
    p?.sessionId ??
    p?.sessionID ??
    p?.id ??
    props?.sessionId ??
    props?.id ??
    null;

  if (!sessionId || typeof sessionId !== "string") {
    return (
      <div style={{ padding: 24 }}>
        <h1>Session</h1>
        <div style={{ color: "red" }}>Invalid sessionId</div>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) redirect("/login");

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
  const isLockedOrComputed =
    statusLower === "locked" ||
    statusLower === "computed" ||
    Boolean((lifecycle as any)?.already_computed);

  const { data: sessionPlayersRaw, error: spErr } = await supabase
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

  const { data: sundayApprovedRaw, error: sagErr } = await supabase
    .from("player_registry_groups")
    .select("player_id")
    .eq("group_key", "sunday");

  if (sagErr) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Sunday Session</h1>
        <div style={{ color: "red" }}>{sagErr.message}</div>
      </div>
    );
  }

  const { data: entries, error: eErr } = await supabase
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

  const approvedPlayerIds = (sundayApprovedRaw ?? [])
    .map((r: any) => r.player_id)
    .filter(Boolean);

  const allNeededIds = Array.from(
    new Set([...sessionPlayerIds, ...approvedPlayerIds])
  );

  let playersById = new Map<string, { id: string; full_name: string | null }>();

  if (allNeededIds.length > 0) {
    const { data: playerRows, error: pErr } = await supabase
      .from("player_registry")
      .select("id, full_name")
      .in("id", allNeededIds);

    if (pErr) {
      return (
        <div style={{ padding: 24 }}>
          <h1>Sunday Session</h1>
          <div style={{ color: "red" }}>{pErr.message}</div>
        </div>
      );
    }

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

  const sessionPlayerIdSet = new Set(sessionPlayerIds);

  const addablePlayers = approvedPlayerIds
    .filter((id: string) => !sessionPlayerIdSet.has(id))
    .map((id: string) => playersById.get(id))
    .filter(Boolean)
    .sort((a: any, b: any) =>
      String(a.full_name ?? "").localeCompare(String(b.full_name ?? ""))
    )
    .map((p: any) => ({
      id: p.id as string,
      full_name: p.full_name as string | null,
    }));

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

  let statusTone: "green" | "yellow" | "blue" | "gray" | "red" = "gray";
  if (statusLower === "active" || statusLower === "open") statusTone = "green";
  else if (statusLower === "locked") statusTone = "yellow";
  else if (statusLower === "computed") statusTone = "blue";
  else if (statusLower === "draft" || statusLower === "scheduled") statusTone = "gray";
  else if (statusLower === "archived" || statusLower === "closed") statusTone = "gray";
  else statusTone = "red";

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>
            Sunday Session
          </h1>

          <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Badge
              label={`Status: ${(lifecycle as any)?.status ?? "unknown"}`}
              tone={statusTone}
            />
            {statusLower === "computed" && <Badge label="Settlement Ready" tone="blue" />}
          </div>

          <div style={{ marginTop: 10 }}>
            <a
              href={`/dashboard/admin/audit?session=${sessionId}`}
              style={{
                fontSize: 13,
                fontWeight: 800,
                textDecoration: "underline",
                color: "#93c5fd",
              }}
            >
              View in Audit Log
            </a>
          </div>
        </div>

        <div style={{ minWidth: 260, flex: "0 0 320px" }}>
          <div
            style={{
              border: "1px solid #1f2937",
              borderRadius: 14,
              padding: 14,
              background: "#0b1220",
              color: "white",
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Session Actions</div>
            <div style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 12 }}>
              Add players and enter totals before lock and compute.
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {(lifecycle as any)?.can_lock && (
                <form
                  action={`/dashboard/sunday/sessions/${sessionId}/lock`}
                  method="post"
                >
                  <PrimaryButton>Lock session</PrimaryButton>
                </form>
              )}

              {(lifecycle as any)?.can_unlock && (
                <form
                  action={`/dashboard/sunday/sessions/${sessionId}/unlock`}
                  method="post"
                >
                  <PrimaryButton variant="danger">Unlock session</PrimaryButton>
                </form>
              )}

              {(lifecycle as any)?.can_compute && (
                <form
                  action={`/dashboard/sunday/sessions/${sessionId}/compute`}
                  method="post"
                >
                  <ConfirmSubmitButton
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1px solid #1d4ed8",
                      background: "#0a1f44",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: 900,
                    }}
                    confirmText={
                      `Compute settlement for this Sunday session?\n\n` +
                      `Session: ${sessionId}\n\n` +
                      `This will post results to the ledger. Continue?`
                    }
                  >
                    Compute settlement
                  </ConfirmSubmitButton>
                </form>
              )}

              {!Boolean((lifecycle as any)?.can_lock) &&
                !Boolean((lifecycle as any)?.can_unlock) &&
                !Boolean((lifecycle as any)?.can_compute) && (
                  <div style={{ fontSize: 13, color: "#cbd5e1" }}>
                    No actions available.
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>

      <SundayAdminTableClient
        sessionId={sessionId}
        addablePlayers={addablePlayers}
        initialRows={tableRows}
        disabled={isLockedOrComputed}
      />

      <PayoutSummary
        sessionId={sessionId}
        status={String((lifecycle as any)?.status ?? "").toLowerCase()}
      />
    </div>
  );
}