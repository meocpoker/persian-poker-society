import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SessionFilterClient from "./SessionFilterClient";
import { sessionDisplayName } from "@/lib/sessions/sessionDisplayName";

function buildQueryString(params: Record<string, string | null | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v && String(v).trim().length > 0) sp.set(k, String(v).trim());
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

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

  // Admin check (any admin row)
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
    // If a session filter is set, load session fields so we can display a friendly name
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

  // Load distinct group/action values for quick filter links
  const { data: groupsRaw } = await supabase
    .from("admin_action_log")
    .select("group_key")
    .order("group_key", { ascending: true })
    .limit(200);

  const groups = Array.from(
    new Set((groupsRaw ?? []).map((r: any) => String(r.group_key)).filter(Boolean))
  );

  const { data: actionsRaw } = await supabase
    .from("admin_action_log")
    .select("action")
    .order("action", { ascending: true })
    .limit(200);

  const actions = Array.from(
    new Set((actionsRaw ?? []).map((r: any) => String(r.action)).filter(Boolean))
  );

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

    if (rangeFilter === "24h") {
      since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    if (rangeFilter === "7d") {
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    if (rangeFilter === "30d") {
      since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    if (since) {
      query = query.gte("created_at", since.toISOString());
    }
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

  const clearHref = "/dashboard/admin/audit";

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>Admin Audit Log</h1>

      <div style={{ marginTop: 12 }}>
        <a
          href={`/api/admin/audit/export${buildQueryString({
            group: groupFilter || null,
            action: actionFilter || null,
            session: sessionFilter || null,
            range: rangeFilter || null,
          })}`}
          style={{
            fontSize: 12,
            fontWeight: 800,
            border: "1px solid rgba(15,23,42,0.2)",
            padding: "6px 12px",
            borderRadius: 10,
            textDecoration: "none",
            color: "white",
            background: "#0b1220",
            display: "inline-block",
          }}
        >
          Download CSV
        </a>
      </div>

      {/* Filters */}
      <div
        style={{
          marginTop: 14,
          padding: 12,
          border: "1px solid rgba(15,23,42,0.12)",
          borderRadius: 12,
          background: "white",
          display: "grid",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontSize: 13, color: "#475569" }}>
            Showing latest <b>100</b> records
          </div>

          {(groupFilter || actionFilter || sessionFilter || rangeFilter) && (
            <Link
              href={clearHref}
              style={{
                fontSize: 12,
                fontWeight: 800,
                border: "1px solid rgba(15,23,42,0.2)",
                padding: "6px 10px",
                borderRadius: 10,
                textDecoration: "none",
                color: "#0f172a",
                background: "#f8fafc",
              }}
            >
              Clear filters
            </Link>
          )}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>Quick filters</div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontSize: 12, color: "#475569", fontWeight: 800 }}>Group:</div>
            {groups.length ? (
              groups.map((g) => (
                <Link
                  key={g}
                  href={
                    "/dashboard/admin/audit" +
                    buildQueryString({
                      group: g,
                      action: actionFilter || null,
                      session: sessionFilter || null,
                      range: rangeFilter || null,
                      page: "1",
                    })
                  }
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    border: "1px solid rgba(15,23,42,0.15)",
                    padding: "6px 10px",
                    borderRadius: 999,
                    textDecoration: "none",
                    color: groupFilter === g ? "white" : "#0f172a",
                    background: groupFilter === g ? "#0b1220" : "#f8fafc",
                  }}
                >
                  {g}
                </Link>
              ))
            ) : (
              <span style={{ fontSize: 12, color: "#64748b" }}>—</span>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontSize: 12, color: "#475569", fontWeight: 800 }}>Action:</div>
            {actions.length ? (
              actions.map((a) => (
                <Link
                  key={a}
                  href={
                    "/dashboard/admin/audit" +
                    buildQueryString({
                      group: groupFilter || null,
                      action: a,
                      session: sessionFilter || null,
                      range: rangeFilter || null,
                      page: "1",
                    })
                  }
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    border: "1px solid rgba(15,23,42,0.15)",
                    padding: "6px 10px",
                    borderRadius: 999,
                    textDecoration: "none",
                    color: actionFilter === a ? "white" : "#0f172a",
                    background: actionFilter === a ? "#0b1220" : "#f8fafc",
                  }}
                >
                  {a}
                </Link>
              ))
            ) : (
              <span style={{ fontSize: 12, color: "#64748b" }}>—</span>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
  <div style={{ fontSize: 12, color: "#475569", fontWeight: 800 }}>Session:</div>

  {sessionFilter ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 900 }}>
        {sessionRow ? sessionDisplayName(sessionRow) : "Loading…"}
      </div>
      <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>
        {sessionFilter}
      </div>
    </div>
  ) : (
    <div style={{ fontSize: 12, color: "#64748b" }}>—</div>
  )}
</div>
          </div>
        </div>
      </div>

      <SessionFilterClient />

      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 900 }}>Date range:</div>

        <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
          {["24h", "7d", "30d"].map((r) => (
            <a
              key={r}
              href={`/dashboard/admin/audit${buildQueryString({
                group: groupFilter || null,
                action: actionFilter || null,
                session: sessionFilter || null,
                range: r,
                page: "1",
              })}`}
              style={{
                fontSize: 12,
                fontWeight: 800,
                border: "1px solid rgba(15,23,42,0.15)",
                padding: "6px 10px",
                borderRadius: 999,
                textDecoration: "none",
                color: rangeFilter === r ? "white" : "#0f172a",
                background: rangeFilter === r ? "#0b1220" : "#f8fafc",
              }}
            >
              {r}
            </a>
          ))}

          <a
            href={`/dashboard/admin/audit${buildQueryString({
              group: groupFilter || null,
              action: actionFilter || null,
              session: sessionFilter || null,
              range: null,
              page: "1",
            })}`}
            style={{
              fontSize: 12,
              fontWeight: 800,
              border: "1px solid rgba(15,23,42,0.15)",
              padding: "6px 10px",
              borderRadius: 999,
              textDecoration: "none",
              color: !rangeFilter ? "white" : "#0f172a",
              background: !rangeFilter ? "#0b1220" : "#f8fafc",
            }}
          >
            all
          </a>
        </div>
      </div>

      {/* Results */}
      <div style={{ marginTop: 20 }}>
        {!logs?.length ? (
          <div style={{ color: "#64748b" }}>No records found.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {{logs.map((log: any, idx: number) => {
  const isTopRowForSession = Boolean(sessionFilter) && idx === 0;

  return (
    <div
      key={log.id}
      style={{
        border: isTopRowForSession
          ? "2px solid rgba(15,23,42,0.55)"
          : "1px solid rgba(15,23,42,0.12)",
        borderRadius: 12,
        padding: 12,
        background: isTopRowForSession ? "rgba(15,23,42,0.04)" : "white",
        boxShadow: isTopRowForSession ? "0 8px 24px rgba(15,23,42,0.08)" : undefined,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          {new Date(log.created_at).toISOString().replace("T", " ").replace("Z", " UTC")}
        </div>

        {isTopRowForSession && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 900,
              color: "#0f172a",
              border: "1px solid rgba(15,23,42,0.25)",
              padding: "4px 8px",
              borderRadius: 999,
              background: "white",
              whiteSpace: "nowrap",
            }}
          >
            Top match
          </div>
        )}
      </div>

      <div style={{ fontWeight: 900 }}>
        {log.group_key} · {log.action}
      </div>

      <div style={{ fontSize: 13 }}>
        Session:{" "}
        {log.session_id ? (
          <Link
            href={
              log.group_key === "sunday"
                ? `/dashboard/sunday/sessions/${sessionDisplayName({
  id: log.session_id,
  group_key: log.group_key,
  format: undefined,
  starts_at: undefined,
})}`
                : `/dashboard/doostaneh/sessions/${sessionDisplayName({
  id: log.session_id,
  group_key: log.group_key,
  format: undefined,
  starts_at: undefined,
})}`
            }
            style={{ fontFamily: "monospace", textDecoration: "underline" }}
          >
            {sessionDisplayName({
  id: log.session_id,
  group_key: log.group_key,
  format: undefined,
  starts_at: undefined,
})}
          </Link>
        ) : (
          <span style={{ fontFamily: "monospace" }}>—</span>
        )}
      </div>

      <div style={{ fontSize: 13 }}>
        Status: <b>{log.status}</b>
      </div>

      {log.message && <div style={{ fontSize: 13, marginTop: 4 }}>{log.message}</div>}
    </div>
  );
})}