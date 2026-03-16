import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SessionFilterClient from "./SessionFilterClient";
import { sessionDisplayName } from "@/lib/sessions/sessionDisplayName";
import PageShell from "@/app/components/ui/PageShell";
import SectionCard from "@/app/components/ui/SectionCard";

function formatAuditTimestamp(value: string) {
  const dt = new Date(value);

  const datePart = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  }).format(dt);

  const timePart = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(dt);

  return `${datePart} ${timePart} EST`;
}

function prettyStatus(status: string | null | undefined) {
  if (!status) return "Completed";
  if (status.toLowerCase() === "ok") return "Completed";
  return status;
}

function prettyAction(action: string | null | undefined) {
  const a = String(action ?? "").toLowerCase();

  if (a === "lock_session") return "LOCKED";
  if (a === "unlock_session") return "OPEN AGAIN";
  if (a === "compute_payout") return "COMPUTED";
  if (a.includes("set_finish_place")) return "FINISH PLACE UPDATED";
  if (a.includes("set_addon")) return "ADD-ON UPDATED";
  if (a.includes("set_rebuys")) return "REBUYS UPDATED";
  if (a.includes("set_charity")) return "CHARITY UPDATED";
  if (a.includes("remove_player")) return "PLAYER REMOVED";
  if (a.includes("add_player")) return "PLAYER ADDED";
  if (a.includes("open_doostaneh_tournament")) return "TOURNAMENT OPENED";

  return a.replaceAll("_", " ").toUpperCase();
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams?: {
    group?: string;
    action?: string;
    session?: string;
    page?: string;
    from?: string;
    to?: string;
  };
}) {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) redirect("/login");

  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!adminRow) redirect("/login");

  const groupFilter = searchParams?.group ?? "";
  const actionFilter = searchParams?.action ?? "";
  const sessionFilter = searchParams?.session ?? "";
  const fromFilter = searchParams?.from ?? "";
  const toFilter = searchParams?.to ?? "";

  const sessionId = sessionFilter || "";
  let sessionRow: any = null;

  if (sessionId) {
    const { data: sRow } = await supabase
      .from("sessions")
      .select("id, group_key, format, starts_at, external_game_id, status")
      .eq("id", sessionId)
      .maybeSingle();

    sessionRow = sRow ?? null;
  }

  let query = supabase
    .from("admin_action_log")
    .select("*")
    .order("created_at", { ascending: false })
    .range(
      (Number(searchParams?.page ?? "1") - 1) * 100,
      (Number(searchParams?.page ?? "1") - 1) * 100 + 99
    );

  if (fromFilter) {
    query = query.gte("created_at", `${fromFilter}T00:00:00.000Z`);
  }

  if (toFilter) {
    query = query.lte("created_at", `${toFilter}T23:59:59.999Z`);
  }

  if (groupFilter) query = query.eq("group_key", groupFilter);
  if (actionFilter) query = query.eq("action", actionFilter);
  if (sessionFilter) query = query.eq("session_id", sessionFilter);

  const { data: logs, error } = await query;

  if (error) {
    return (
      <PageShell
        eyebrow="Persian Men Society"
        title="Admin Audit Log"
        description="Administrative actions recorded by the system."
      >
        <SectionCard title="Error">
          <div style={{ color: "#8B1E2D" }}>{error.message}</div>
        </SectionCard>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Persian Men Society"
      title="Admin Audit Log"
      description="Administrative actions recorded by the system."
      actions={
        <Link
          href="/dashboard"
          style={{
            fontWeight: 800,
            color: "#1F7A63",
            textDecoration: "none",
          }}
        >
          Back to Dashboard
        </Link>
      }
    >
      {sessionFilter && sessionRow && (
        <div
          style={{
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 800,
            color: "#17342D",
          }}
        >
          Session: {sessionDisplayName(sessionRow)}
        </div>
      )}

      <SectionCard title="Filters">
        <SessionFilterClient />
      </SectionCard>

      <div style={{ height: 16 }} />

      <SectionCard title="Audit Activity">
        {!logs?.length ? (
          <div style={{ color: "#6A746F" }}>No records found.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {logs.map((log: any, idx: number) => {
              const highlight = Boolean(sessionFilter) && idx === 0;

              const sessionHref =
                log.session_id && log.group_key === "sunday"
                  ? `/dashboard/sunday/sessions/${log.session_id}`
                  : log.session_id && log.group_key === "doostaneh"
                  ? `/dashboard/doostaneh/sessions/${log.session_id}`
                  : null;

              return (
                <div
                  key={log.id}
                  style={{
                    border: highlight
                      ? "2px solid rgba(29,78,216,0.45)"
                      : "1px solid #E3E0D8",
                    borderRadius: 12,
                    padding: 12,
                    background: highlight ? "rgba(29,78,216,0.05)" : "#FFFCF7",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 900,
                        color: "#17342D",
                        fontSize: 14,
                      }}
                    >
                      {log.group_key} · {prettyAction(log.action)}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: "#17342D",
                        fontWeight: 400,
                      }}
                    >
                      {formatAuditTimestamp(log.created_at)}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 13,
                      color: "#17342D",
                      fontWeight: 400,
                    }}
                  >
                    <span style={{ color: "#17342D" }}>Status:</span>{" "}
                    {prettyStatus(log.status)}
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 13,
                      color: "#17342D",
                      fontWeight: 400,
                    }}
                  >
                    <span style={{ color: "#17342D" }}>Session:</span>{" "}
                    {sessionHref ? (
                      <Link
                        href={sessionHref}
                        style={{
                          fontFamily: "monospace",
                          textDecoration: "underline",
                          color: "#17342D",
                          fontWeight: 400,
                        }}
                      >
                        {sessionDisplayName({
                          id: log.session_id,
                          group_key: log.group_key,
                        })}
                      </Link>
                    ) : (
                      <span style={{ fontFamily: "monospace", color: "#17342D" }}>
                        —
                      </span>
                    )}
                  </div>

                  {log.message && (
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 13,
                        color: "#17342D",
                        fontWeight: 400,
                      }}
                    >
                      {log.message}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </PageShell>
  );
}