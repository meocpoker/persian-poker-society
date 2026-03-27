import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getSessionIdFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  const idx = parts.findIndex((p) => p === "sessions");
  if (idx === -1) return null;
  return parts[idx + 1] ?? null;
}

function money(value: number) {
  const n = Number(value || 0);
  return `$${n.toFixed(2)}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function POST(req: Request, ctx: any) {
  const supabase = await createClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user;

  if (userErr || !user) {
    return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
  }

  const url = new URL(req.url);
  const sessionId =
    ctx?.params?.sessionId ??
    ctx?.params?.sessionID ??
    getSessionIdFromPath(url.pathname);

  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json(
      { ok: false, error: `Missing sessionId (got: ${String(sessionId)})` },
      { status: 400 }
    );
  }

  const { data: lifecycle, error: lifeErr } = await supabase
    .rpc("admin_session_lifecycle", { p_session_id: sessionId })
    .maybeSingle();

  if (lifeErr) {
    return NextResponse.json({ ok: false, error: lifeErr.message }, { status: 400 });
  }

  if (!(lifecycle as any)?.is_admin) {
    return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 });
  }

  const statusLower = String((lifecycle as any)?.status ?? "").toLowerCase();
  const isAlreadyComputed = Boolean((lifecycle as any)?.already_computed);

if (statusLower !== "computed" && !isAlreadyComputed) {
    return NextResponse.json(
      { ok: false, error: "Session must be computed before emailing results." },
      { status: 400 }
    );
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESULTS_EMAIL_FROM || process.env.RESEND_FROM_EMAIL;

  if (!resendApiKey || !fromEmail) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Missing email configuration. Set RESEND_API_KEY and RESULTS_EMAIL_FROM (or RESEND_FROM_EMAIL).",
      },
      { status: 500 }
    );
  }

  const { data: sessionRow, error: sessionErr } = await supabase
    .from("sessions")
    .select("id, group_key, starts_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionErr || !sessionRow) {
    return NextResponse.json(
      { ok: false, error: sessionErr?.message || "Session not found." },
      { status: 400 }
    );
  }

  const { data: sessionPlayersRaw, error: playersErr } = await supabase
    .from("session_registry_players")
    .select("player_id")
    .eq("session_id", sessionId);

  if (playersErr) {
    return NextResponse.json({ ok: false, error: playersErr.message }, { status: 400 });
  }

  const sessionPlayerIds = (sessionPlayersRaw ?? [])
    .map((row: any) => row.player_id)
    .filter(Boolean);

  if (sessionPlayerIds.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No players found for this session." },
      { status: 400 }
    );
  }

  const { data: playerRows, error: registryErr } = await supabase
    .from("player_registry")
    .select("id, full_name, email")
    .in("id", sessionPlayerIds);

  if (registryErr) {
    return NextResponse.json({ ok: false, error: registryErr.message }, { status: 400 });
  }

  const { data: entryRows, error: entriesErr } = await supabase
    .from("player_entries")
    .select("registry_player_id, type, amount_usd")
    .eq("session_id", sessionId);

  if (entriesErr) {
    return NextResponse.json({ ok: false, error: entriesErr.message }, { status: 400 });
  }

  const { data: ledgerRows, error: ledgerErr } = await supabase
    .from("ledger_transactions")
    .select("registry_player_id, delta_usd, session_id, group_key")
    .eq("session_id", sessionId)
    .eq("group_key", "sunday");

  if (ledgerErr) {
    return NextResponse.json({ ok: false, error: ledgerErr.message }, { status: 400 });
  }

  const playersById = new Map<string, { full_name: string | null; email: string | null }>();
  for (const row of playerRows ?? []) {
    playersById.set(row.id, {
      full_name: row.full_name ?? null,
      email: row.email ?? null,
    });
  }

  const buyinMap = new Map<string, number>();
  const cashoutMap = new Map<string, number>();

  for (const row of entryRows ?? []) {
    const pid = row.registry_player_id;
    if (!pid) continue;
    if (row.type === "buyin") buyinMap.set(pid, Number(row.amount_usd || 0));
    if (row.type === "cashout") cashoutMap.set(pid, Number(row.amount_usd || 0));
  }

  const settlementMap = new Map<string, number>();
  for (const row of ledgerRows ?? []) {
    const pid = row.registry_player_id;
    if (!pid) continue;
    settlementMap.set(pid, Number(row.delta_usd || 0));
  }

  const resultRows = sessionPlayerIds
    .map((playerId) => {
      const player = playersById.get(playerId);
      return {
        playerId,
        fullName: player?.full_name ?? playerId,
        email: player?.email ?? null,
        buyin: Number(buyinMap.get(playerId) || 0),
        cashout: Number(cashoutMap.get(playerId) || 0),
        settlement: Number(settlementMap.get(playerId) || 0),
      };
    })
    .sort((a, b) => String(a.fullName).localeCompare(String(b.fullName)));

  const recipients = resultRows
    .map((row) => row.email)
    .filter((email): email is string => Boolean(email));

  if (recipients.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No email addresses found for players in this session." },
      { status: 400 }
    );
  }

  const sessionDate = sessionRow.starts_at
    ? new Date(sessionRow.starts_at).toLocaleString("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Unknown date";

  const subject = `Sunday Game Results - ${sessionDate}`;

const textLines = [
  `Friday Game Results`,
  ``,
  `Date: ${sessionDate}`,
    ``,
    `Player Results:`,
    ...resultRows.map(
      (row) =>
        `${row.fullName} | Buy-in: ${money(row.buyin)} | Cash-out: ${money(
          row.cashout
        )} | Settlement: ${money(row.settlement)}`
    ),
  ];

  const htmlRows = resultRows
    .map(
      (row) => `
        <tr>
          <td style="padding:8px 10px;border:1px solid #d9d3c7;">${escapeHtml(
            row.fullName
          )}</td>
          <td style="padding:8px 10px;border:1px solid #d9d3c7;text-align:right;">${escapeHtml(
            money(row.buyin)
          )}</td>
          <td style="padding:8px 10px;border:1px solid #d9d3c7;text-align:right;">${escapeHtml(
            money(row.cashout)
          )}</td>
          <td style="padding:8px 10px;border:1px solid #d9d3c7;text-align:right;">${escapeHtml(
            money(row.settlement)
          )}</td>
        </tr>
      `
    )
    .join("");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#17342D;line-height:1.5;">
      <h2 style="margin:0 0 12px 0;">Sunday Game Results</h2>
      <p style="margin:0 0 18px 0;"><strong>Date:</strong> ${escapeHtml(sessionDate)}</p>

      <table style="border-collapse:collapse;width:100%;max-width:760px;">
        <thead>
          <tr>
            <th style="padding:8px 10px;border:1px solid #d9d3c7;background:#F8F3EA;text-align:left;">Player</th>
            <th style="padding:8px 10px;border:1px solid #d9d3c7;background:#F8F3EA;text-align:right;">Buy-in</th>
            <th style="padding:8px 10px;border:1px solid #d9d3c7;background:#F8F3EA;text-align:right;">Cash-out</th>
            <th style="padding:8px 10px;border:1px solid #d9d3c7;background:#F8F3EA;text-align:right;">Settlement</th>
          </tr>
        </thead>
        <tbody>
          ${htmlRows}
        </tbody>
      </table>
    </div>
  `;

  const sendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: recipients,
      subject,
      text: textLines.join("\n"),
      html,
    }),
  });

  if (!sendRes.ok) {
    const errText = await sendRes.text();
    return NextResponse.json(
      { ok: false, error: `Email send failed: ${errText}` },
      { status: 500 }
    );
  }

  const dest = new URL(`/dashboard/sunday/sessions/${sessionId}`, req.url);
  const res = NextResponse.redirect(dest, { status: 303 });
  res.headers.set("Cache-Control", "no-store");
  return res;
}