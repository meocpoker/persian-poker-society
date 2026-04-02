import type { SupabaseClient } from "@supabase/supabase-js";

function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Sends session results email to all players in the session.
 * Never throws — all failures are silent returns.
 */
export async function sendSessionResultsEmail(
  supabase: SupabaseClient,
  sessionId: string,
  groupKey: "sunday" | "friday"
): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESULTS_EMAIL_FROM || process.env.RESEND_FROM_EMAIL;
  if (!resendApiKey || !fromEmail) return;

  const { data: sessionRow } = await supabase
    .from("sessions")
    .select("id, group_key, starts_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (!sessionRow) return;

  const { data: sessionPlayersRaw } = await supabase
    .from("session_registry_players")
    .select("player_id")
    .eq("session_id", sessionId);

  const sessionPlayerIds = (sessionPlayersRaw ?? [])
    .map((row: any) => row.player_id)
    .filter(Boolean);

  if (sessionPlayerIds.length === 0) return;

  const { data: playerRows } = await supabase
    .from("player_registry")
    .select("id, full_name, email")
    .in("id", sessionPlayerIds);

  const { data: entryRows } = await supabase
    .from("player_entries")
    .select("registry_player_id, type, amount_usd")
    .eq("session_id", sessionId);

  const { data: ledgerRows } = await supabase
    .from("ledger_transactions")
    .select("registry_player_id, delta_usd")
    .eq("session_id", sessionId)
    .eq("group_key", groupKey);

  const playersById = new Map<string, { full_name: string | null; email: string | null }>();
  for (const row of playerRows ?? []) {
    playersById.set(row.id, { full_name: row.full_name ?? null, email: row.email ?? null });
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
    .map((playerId: string) => {
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
    .sort((a: any, b: any) => String(a.fullName).localeCompare(String(b.fullName)));

  const recipients = resultRows
    .map((row: any) => row.email)
    .filter((email: any): email is string => Boolean(email));

  if (recipients.length === 0) return;

  const label = groupKey === "friday" ? "Friday" : "Sunday";

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

  const subject = `${label} Game Results - ${sessionDate}`;

  const textLines = [
    `${label} Game Results`,
    ``,
    `Date: ${sessionDate}`,
    ``,
    `Player Results:`,
    ...resultRows.map(
      (row: any) =>
        `${row.fullName} | Buy-in: ${money(row.buyin)} | Cash-out: ${money(row.cashout)} | Settlement: ${money(row.settlement)}`
    ),
  ];

  const htmlRows = resultRows
    .map(
      (row: any) => `
        <tr>
          <td style="padding:8px 10px;border:1px solid #d9d3c7;">${escapeHtml(row.fullName)}</td>
          <td style="padding:8px 10px;border:1px solid #d9d3c7;text-align:right;">${escapeHtml(money(row.buyin))}</td>
          <td style="padding:8px 10px;border:1px solid #d9d3c7;text-align:right;">${escapeHtml(money(row.cashout))}</td>
          <td style="padding:8px 10px;border:1px solid #d9d3c7;text-align:right;">${escapeHtml(money(row.settlement))}</td>
        </tr>`
    )
    .join("");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#17342D;line-height:1.5;">
      <h2 style="margin:0 0 12px 0;">${escapeHtml(label)} Game Results</h2>
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
        <tbody>${htmlRows}</tbody>
      </table>
    </div>`;

  await fetch("https://api.resend.com/emails", {
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
  }).catch(() => {}); // silent on send failure
}
