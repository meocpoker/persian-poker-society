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

  const style: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.2,
    ...tones[tone],
  };

  return <span style={style}>{label}</span>;
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

  const statusLower = String((lifecycle as any)?.status).toLowerCase();

  const isComputed =
    statusLower === "computed" ||
    Boolean((lifecycle as any)?.already_computed);

  let statusTone: "green" | "yellow" | "blue" | "gray" | "red" = "gray";
  if (statusLower === "active" || statusLower === "open") statusTone = "green";
  else if (statusLower === "locked") statusTone = "yellow";
  else if (statusLower === "computed") statusTone = "blue";
  else if (statusLower === "draft" || statusLower === "scheduled")
    statusTone = "gray";
  else if (statusLower === "archived" || statusLower === "closed")
    statusTone = "gray";
  else statusTone = "red";

  return (
    <div style={{ padding: 24, maxWidth: 920, margin: "0 auto" }}>
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
            {isComputed && <Badge label="Payouts Ready" tone="blue" />}
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
              Use these buttons to move the session forward.
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
                      `Compute payouts for this session?\n\n` +
                      `Session: ${sessionId}\n\n` +
                      `This will post payouts to the ledger. Continue?`
                    }
                  >
                    Compute payouts
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

      <PayoutSummary
        sessionId={sessionId}
        status={String((lifecycle as any)?.status ?? "").toLowerCase()}
      />
    </div>
  );
}