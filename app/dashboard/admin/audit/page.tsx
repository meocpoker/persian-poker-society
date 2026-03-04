// app/dashboard/admin/audit/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SessionFilterClient from "./SessionFilterClient";
import { sessionDisplayName } from "@/lib/sessions/sessionDisplayName";

export default async function AuditPage({
  searchParams,
}: {
  searchParams?: {
    group?: string;
    action?: string;
    session?: string;
    page?: string;
    range?: string;
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
  const rangeFilter = searchParams?.range ?? "";

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

  if (rangeFilter) {
    const now = new Date();
    let since: Date | null = null;

    if (rangeFilter === "24h")
      since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    if (rangeFilter === "7d")
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (rangeFilter === "30d")
      since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (since) query = query.gte("created_at", since.toISOString());
  }

  if (groupFilter) query = query.eq("group_key", groupFilter);
  if (actionFilter) query = query.eq("action", actionFilter);
  if (sessionFilter) query = query.eq("session_id", sessionFilter);

  const { data: logs, error } = await query;

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Admin Audit Log</h1>
        <div style={{ color: "red" }}>{error.message}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>
            Admin Audit Log
          </h1>

          {sessionFilter && sessionRow && (
            <div style={{ marginTop: 8, fontSize: 13, fontWeight: 800 }}>
              Session: {sessionDisplayName(sessionRow)}
            </div>
          )}
        </div>

        <div style={{ fontSize: 13 }}>
          <Link href="/dashboard" className="underline">
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <SessionFilterClient />
      </div>

      <div style={{ marginTop: 18 }}>
        {!logs?.length ? (
          <div style={{ color: "#64748b" }}>No records found.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {logs.map((log: any, idx: number) => {
              const highlight = Boolean(sessionFilter) && idx === 0;

              const dt = new Date(log.created_at);
              const when = dt.toISOString().replace("T", " ").replace("Z", " UTC");

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
                      : "1px solid rgba(15,23,42,0.12)",
                    borderRadius: 12,
                    padding: 12,
                    background: highlight ? "rgba(29,78,216,0.05)" : "white",
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
                    <div style={{ fontWeight: 900 }}>
                      {log.group_key} · {log.action}
                    </div>

                    <div style={{ fontSize: 12, color: "#64748b" }}>{when}</div>
                  </div>

                  <div style={{ marginTop: 6, fontSize: 13 }}>
                    <span style={{ color: "#64748b" }}>Status:</span>{" "}
                    <b>{log.status}</b>
                  </div>

                  <div style={{ marginTop: 6, fontSize: 13 }}>
                    <span style={{ color: "#64748b" }}>Session:</span>{" "}
                    {sessionHref ? (
                      <Link
                        href={sessionHref}
                        style={{
                          fontFamily: "monospace",
                          textDecoration: "underline",
                        }}
                      >
                        {sessionDisplayName({
                          id: log.session_id,
                          group_key: log.group_key,
                        })}
                      </Link>
                    ) : (
                      <span style={{ fontFamily: "monospace" }}>—</span>
                    )}
                  </div>

                  {log.message && (
                    <div style={{ marginTop: 8, fontSize: 13 }}>{log.message}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}