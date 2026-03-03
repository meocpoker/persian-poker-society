import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConfirmSubmitButton from "./ConfirmSubmitButton";

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

    const statusLower = String(lifecycle.status).toLowerCase();

  // Canonical statuses: draft | active | locked | computed | archived
  // Also tolerate legacy: open | scheduled | closed
  const isLocked = statusLower === "locked" || Boolean(lifecycle.can_unlock);
  const isComputed = statusLower === "computed" || Boolean(lifecycle.already_computed);
  const isActive =
    statusLower === "active" ||
    statusLower === "open"; // legacy support

  let statusTone: "green" | "yellow" | "blue" | "gray" | "red" = "gray";
  if (statusLower === "active" || statusLower === "open") statusTone = "green";
  else if (statusLower === "locked") statusTone = "yellow";
  else if (statusLower === "computed") statusTone = "blue";
  else if (statusLower === "draft" || statusLower === "scheduled") statusTone = "gray";
  else if (statusLower === "archived" || statusLower === "closed") statusTone = "gray";
  else statusTone = "red";

  const buttonStyle: React.CSSProperties = {
    marginTop: 12,
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #334155",
    background: "#0b1220",
    color: "white",
    cursor: "pointer",
    width: "fit-content",
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>
        Sunday Session Control Panel
      </h1>
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>
  Sunday Session Control Panel
</h1>

<div style={{ marginTop: 8 }}>
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
<div style={{ marginTop: 8 }}>
  <a
    href={`/dashboard/admin/audit?session=${sessionId}`}
    style={{
      fontSize: 12,
      fontWeight: 800,
      textDecoration: "underline",
      color: "#0b1220",
    }}
  >
    View in Audit Log
  </a>
</div>
      {/* Badges */}
      <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Badge label={`Status: ${lifecycle.status}`} tone={statusTone} />
        {isActive && <Badge label="Active" tone="green" />}
        {isLocked && <Badge label="Locked" tone="yellow" />}
        {isComputed && <Badge label="Computed" tone="blue" />}
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div>
            <b>Role:</b> {lifecycle.role}
          </div>
          <div>
            <b>Is Admin:</b> {String(lifecycle.is_admin)}
          </div>
          <div>
            <b>Already Computed:</b> {String(lifecycle.already_computed)}
          </div>
        </div>

        <hr style={{ borderColor: "#1f2937" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div>
            <b>can_lock:</b> {String(lifecycle.can_lock)}
          </div>
          <div>
            <b>can_unlock:</b> {String(lifecycle.can_unlock)}
          </div>
          <div>
            <b>can_compute:</b> {String(lifecycle.can_compute)}
          </div>
        </div>

        {lifecycle.can_lock && (
          <form action={`/dashboard/sunday/sessions/${sessionId}/lock`} method="post">
            <button type="submit" style={buttonStyle}>
              Lock session
            </button>
          </form>
        )}

        {lifecycle.can_unlock && (
          <form action={`/dashboard/sunday/sessions/${sessionId}/unlock`} method="post">
            <button type="submit" style={buttonStyle}>
              Unlock session
            </button>
          </form>
        )}

        {lifecycle.can_compute && (
          <form action={`/dashboard/sunday/sessions/${sessionId}/compute`} method="post">
            <ConfirmSubmitButton
              style={buttonStyle}
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
      </div>
    </div>
  );
}