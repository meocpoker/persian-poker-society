// app/dashboard/sunday/sessions/[sessionId]/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConfirmSubmitButton from "./ConfirmSubmitButton";
import PayoutSummary from "./PayoutSummary";

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

  const { data: lifecycle } = await supabase
    .rpc("admin_session_lifecycle", { p_session_id: sessionId })
    .maybeSingle();

  const { data: entries } = await supabase
    .from("player_entries")
    .select("registry_player_id, type, amount_usd");

  const { data: players } = await supabase
    .from("player_registry")
    .select("id, full_name")
    .order("full_name");

  const buyins: Record<string, number> = {};
  const cashouts: Record<string, number> = {};

  (entries ?? []).forEach((e: any) => {
    if (!e.registry_player_id) return;
    if (e.type === "buyin") buyins[e.registry_player_id] = e.amount_usd;
    if (e.type === "cashout") cashouts[e.registry_player_id] = e.amount_usd;
  });

  const statusLower = String((lifecycle as any)?.status).toLowerCase();

  return (
    <div style={{ padding: 24, maxWidth: 920, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>Sunday Session</h1>

      <div style={{ marginTop: 8 }}>
        <Badge
          label={`Status: ${(lifecycle as any)?.status ?? "unknown"}`}
          tone={
            statusLower === "computed"
              ? "blue"
              : statusLower === "locked"
              ? "yellow"
              : "green"
          }
        />
      </div>

      {/* PLAYER ADMIN TABLE */}

      <div
        style={{
          marginTop: 24,
          border: "1px solid #1f2937",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "#0b1220",
            color: "white",
            padding: "10px 14px",
            fontWeight: 900,
          }}
        >
          Player Settlement
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th style={{ padding: 10, textAlign: "left" }}>Player</th>
              <th style={{ padding: 10 }}>Buy-in</th>
              <th style={{ padding: 10 }}>Cash-out</th>
              <th style={{ padding: 10 }}>Net</th>
            </tr>
          </thead>

          <tbody>
            {(players ?? []).map((p: any) => {
              const buy = buyins[p.id] ?? 0;
              const cash = cashouts[p.id] ?? 0;
              const net = cash - buy;

              return (
                <tr key={p.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                  <td style={{ padding: 10 }}>{p.full_name}</td>

                  <td style={{ padding: 10, textAlign: "center" }}>
                    ${buy.toFixed(2)}
                  </td>

                  <td style={{ padding: 10, textAlign: "center" }}>
                    ${cash.toFixed(2)}
                  </td>

                  <td
                    style={{
                      padding: 10,
                      textAlign: "center",
                      fontWeight: 800,
                      color:
                        net > 0
                          ? "#15803d"
                          : net < 0
                          ? "#b91c1c"
                          : "#111827",
                    }}
                  >
                    {net > 0 ? "+" : ""}${net.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* SESSION ACTIONS */}

      <div style={{ marginTop: 24 }}>
        {(lifecycle as any)?.can_lock && (
          <form action={`/dashboard/sunday/sessions/${sessionId}/lock`} method="post">
            <PrimaryButton>Lock session</PrimaryButton>
          </form>
        )}

        {(lifecycle as any)?.can_unlock && (
          <form action={`/dashboard/sunday/sessions/${sessionId}/unlock`} method="post">
            <PrimaryButton variant="danger">Unlock session</PrimaryButton>
          </form>
        )}

        {(lifecycle as any)?.can_compute && (
          <form action={`/dashboard/sunday/sessions/${sessionId}/compute`} method="post">
            <ConfirmSubmitButton
              style={{
                marginTop: 10,
                width: "100%",
                padding: "12px",
                borderRadius: 12,
                border: "1px solid #1d4ed8",
                background: "#0a1f44",
                color: "white",
                fontWeight: 900,
              }}
              confirmText={`Compute payouts for this session?\n\nSession: ${sessionId}`}
            >
              Compute payouts
            </ConfirmSubmitButton>
          </form>
        )}
      </div>

      <PayoutSummary
        sessionId={sessionId}
        status={String((lifecycle as any)?.status ?? "").toLowerCase()}
      />
    </div>
  );
}