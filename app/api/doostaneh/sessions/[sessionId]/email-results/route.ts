import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

function getSessionIdFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  const idx = parts.findIndex((p) => p === "sessions");
  if (idx === -1) return null;
  return parts[idx + 1] ?? null;
}

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

function placeLabel(place: number): string {
  if (place === 1) return "🥇 1st";
  if (place === 2) return "🥈 2nd";
  if (place === 3) return "🥉 3rd";
  return `${place}th`;
}

export async function POST(req: Request, ctx: any) {
  const supabase = await createClient();
  const serviceSupabase = createServiceClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user;

  if (userErr || !user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
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
  if (statusLower !== "computed") {
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

  let body: { updated?: boolean } = {};
  try {
    body = await req.json();
  } catch {}
  const isUpdated = body.updated === true;

  const { data: sessionRow, error: sessionErr } = await serviceSupabase
    .from("sessions")
    .select("id, group_key, starts_at, tournament_number, external_game_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionErr || !sessionRow) {
    return NextResponse.json(
      { ok: false, error: sessionErr?.message || "Session not found." },
      { status: 400 }
    );
  }

  const { data: sessionPlayersRaw, error: playersErr } = await serviceSupabase
    .from("session_registry_players")
    .select("player_id, finish_place")
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

  const finishPlaceMap = new Map<string, number | null>();
  for (const row of sessionPlayersRaw ?? []) {
    finishPlaceMap.set(row.player_id, row.finish_place ?? null);
  }

  const { data: playerRows, error: registryErr } = await serviceSupabase
    .from("player_registry")
    .select("id, full_name, email")
    .in("id", sessionPlayerIds);

  if (registryErr) {
    return NextResponse.json({ ok: false, error: registryErr.message }, { status: 400 });
  }

  const { data: entryRows, error: entriesErr } = await serviceSupabase
    .from("player_entries")
    .select("registry_player_id, type, amount_usd")
    .eq("session_id", sessionId);

  if (entriesErr) {
    return NextResponse.json({ ok: false, error: entriesErr.message }, { status: 400 });
  }

  const { data: ledgerRows, error: ledgerErr } = await serviceSupabase
    .from("ledger_transactions")
    .select("registry_player_id, delta_usd, txn_type")
    .eq("session_id", sessionId)
    .eq("group_key", "doostaneh")
    .eq("txn_type", "payout");

  if (ledgerErr) {
    return NextResponse.json({ ok: false, error: ledgerErr.message }, { status: 400 });
  }

  const playersById = new Map<string, { full_name: string | null; email: string | null }>();
  for (const row of playerRows ?? []) {
    playersById.set(row.id, { full_name: row.full_name ?? null, email: row.email ?? null });
  }

  const spentMap = new Map<string, number>();
  for (const row of entryRows ?? []) {
    const pid = row.registry_player_id;
    if (!pid) continue;
    spentMap.set(pid, (spentMap.get(pid) ?? 0) + Number(row.amount_usd || 0));
  }

  const payoutMap = new Map<string, number>();
  for (const row of ledgerRows ?? []) {
    const pid = row.registry_player_id;
    if (!pid) continue;
    payoutMap.set(pid, Number(row.delta_usd || 0));
  }

  const resultRows = sessionPlayerIds
    .map((playerId) => {
      const player = playersById.get(playerId);
      const spent = spentMap.get(playerId) ?? 0;
      const payout = payoutMap.get(playerId) ?? 0;
      return {
        playerId,
        fullName: player?.full_name ?? playerId,
        email: player?.email ?? null,
        spent,
        payout,
        net: payout - spent,
        finishPlace: finishPlaceMap.get(playerId) ?? null,
      };
    })
    .sort((a, b) => {
      if (a.finishPlace !== null && b.finishPlace !== null) return a.finishPlace - b.finishPlace;
      if (a.finishPlace !== null) return -1;
      if (b.finishPlace !== null) return 1;
      return String(a.fullName).localeCompare(String(b.fullName));
    });

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

  const gameLabel = sessionRow.tournament_number
    ? `Game #${sessionRow.tournament_number}`
    : (sessionRow.external_game_id ?? sessionId.slice(0, 8));

  const subject = isUpdated
    ? `Updated Results - Doostaneh ${gameLabel}`
    : `Game Results - Doostaneh ${gameLabel}`;

  const textLines = [
    subject,
    ``,
    `Date: ${sessionDate}`,
    ``,
    `Results:`,
    ...resultRows.map((row) => {
      const place = row.finishPlace ? `${placeLabel(row.finishPlace)} · ` : "";
      const net = row.net > 0 ? `+${money(row.net)}` : money(row.net);
      return `${place}${row.fullName} | Spent: ${money(row.spent)} | Payout: ${money(row.payout)} | Net: ${net}`;
    }),
  ];

  const htmlRows = resultRows
    .map((row) => {
      const netColor = row.net > 0 ? "#15803d" : row.net < 0 ? "#b91c1c" : "#111827";
      const netStr = row.net > 0 ? `+${money(row.net)}` : money(row.net);
      const placeCell = row.finishPlace
        ? `<strong>${escapeHtml(placeLabel(row.finishPlace))}</strong>`
        : `—`;
      return `
        <tr>
          <td style="padding:8px 10px;border:1px solid #d9d3c7;text-align:center;">${placeCell}</td>
          <td style="padding:8px 10px;border:1px solid #d9d3c7;">${escapeHtml(row.fullName)}</td>
          <td style="padding:8px 10px;border:1px solid #d9d3c7;text-align:right;">${escapeHtml(money(row.spent))}</td>
          <td style="padding:8px 10px;border:1px solid #d9d3c7;text-align:right;color:#1F7A63;">${escapeHtml(money(row.payout))}</td>
          <td style="padding:8px 10px;border:1px solid #d9d3c7;text-align:right;font-weight:700;color:${netColor};">${escapeHtml(netStr)}</td>
        </tr>
      `;
    })
    .join("");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#17342D;line-height:1.5;">
      <h2 style="margin:0 0 6px 0;">${escapeHtml(subject)}</h2>
      <p style="margin:0 0 18px 0;color:#6A746F;">${escapeHtml(sessionDate)}</p>
      <table style="border-collapse:collapse;width:100%;max-width:760px;">
        <thead>
          <tr>
            <th style="padding:8px 10px;border:1px solid #d9d3c7;background:#F8F3EA;text-align:center;">Place</th>
            <th style="padding:8px 10px;border:1px solid #d9d3c7;background:#F8F3EA;text-align:left;">Player</th>
            <th style="padding:8px 10px;border:1px solid #d9d3c7;background:#F8F3EA;text-align:right;">Spent</th>
            <th style="padding:8px 10px;border:1px solid #d9d3c7;background:#F8F3EA;text-align:right;">Payout</th>
            <th style="padding:8px 10px;border:1px solid #d9d3c7;background:#F8F3EA;text-align:right;">Net</th>
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

  return NextResponse.json({ ok: true });
}
