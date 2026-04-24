"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ComputeButton from "../../ComputeButton";
import AdminActivity from "../../AdminActivity";

function Badge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "green" | "gold" | "red";
}) {
  const tones: Record<string, React.CSSProperties> = {
    neutral: { border: "1px solid #D9D3C7", background: "#F8F3EA", color: "#4E5B55" },
    green:   { border: "1px solid #B9D7CF", background: "#EDF7F4", color: "#1F7A63" },
    gold:    { border: "1px solid #E5D2A1", background: "#FBF6EA", color: "#8A6A1F" },
    red:     { border: "1px solid #E9C8CF", background: "#FDF0F2", color: "#8B1E2D" },
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 0.2,
        ...tones[tone],
      }}
    >
      {label}
    </span>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #E3E0D8",
        borderRadius: 20,
        padding: 18,
        background: "#FFFCF7",
        boxShadow: "0 10px 30px rgba(31, 42, 55, 0.05)",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 900, color: "#17342D" }}>{title}</div>
      {subtitle ? (
        <div style={{ fontSize: 13, color: "#6A746F", marginTop: 6 }}>{subtitle}</div>
      ) : null}
      <div style={{ marginTop: 16 }}>{children}</div>
    </div>
  );
}

type Session = {
  id: string;
  group_key: string;
  format: string | null;
  starts_at: string | null;
  status: string | null;
  tournament_number: number | null;
  external_game_id: string | null;
  charity_usd: number | null;
  doostaneh_winner_count: number | null;
};

type RegistryPlayer = { id: string; full_name: string | null; email: string | null };

type SRPRow = {
  player_id: string;
  finish_place: number | null;
  player_registry: RegistryPlayer;
};

type EntryRow = {
  id: string;
  session_id: string;
  registry_player_id: string | null;
  type: "buyin" | "rebuy" | "addon" | string;
  amount_usd: number;
};

type LedgerRow = {
  registry_player_id: string | null;
  delta_usd: number | string;
  txn_type: string | null;
};

export default function DoostanehSessionPage() {
  const params = useParams();
  const sessionId = params?.sessionId as string;

  const [session, setSession] = useState<Session | null>(null);
  const [players, setPlayers] = useState<SRPRow[]>([]);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [registry, setRegistry] = useState<RegistryPlayer[]>([]);

  const [winner1, setWinner1] = useState<string>("");
  const [winner2, setWinner2] = useState<string>("");
  const [winner3, setWinner3] = useState<string>("");
  const [winner4, setWinner4] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [draftPlayed, setDraftPlayed] = useState<Set<string>>(new Set());
  const [draftRebuys, setDraftRebuys] = useState<Map<string, number>>(new Map());
  const [draftAddon, setDraftAddon] = useState<Map<string, boolean>>(new Map());
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const prevCharityRef = useRef<number | null>(null);

  const isLockedOrComputed =
    session?.status === "locked" ||
    session?.status === "computed" ||
    session?.status === "closed";

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/doostaneh/sessions/${sessionId}/entry-state`, {
        cache: "no-store",
      });
      const j = await res.json();
      if (!j?.ok) throw new Error(j?.error || "load_failed");

      setSession(j.session);
      setPlayers(j.players || []);
      setEntries(j.entries || []);
      setLedger(j.ledger || []);

      // Initialize draft state from server data
      const serverPlayed = new Set<string>((j.players || []).map((p: any) => p.player_id as string));
      const rebuyAmounts = new Map<string, number>();
      const serverAddonMap = new Map<string, boolean>();
      for (const pid of serverPlayed) {
        rebuyAmounts.set(pid, 0);
        serverAddonMap.set(pid, false);
      }
      for (const e of (j.entries || []) as EntryRow[]) {
        const pid = e.registry_player_id;
        if (!pid) continue;
        if (e.type === "rebuy") {
          rebuyAmounts.set(pid, (rebuyAmounts.get(pid) ?? 0) + Number(e.amount_usd || 0));
        }
        if (e.type === "addon") {
          serverAddonMap.set(pid, Number(e.amount_usd || 0) > 0);
        }
      }
      const serverRebuyMap = new Map<string, number>();
      for (const [pid, amt] of rebuyAmounts) {
        serverRebuyMap.set(pid, Math.min(2, Math.max(0, Math.round(amt / 5))));
      }
      setDraftPlayed(serverPlayed);
      setDraftRebuys(serverRebuyMap);
      setDraftAddon(serverAddonMap);

      const byPlace = new Map<number, string>();
      for (const p of (j.players || []) as SRPRow[]) {
        if (p.finish_place) byPlace.set(p.finish_place, p.player_id);
      }
      setWinner1(byPlace.get(1) ?? "");
      setWinner2(byPlace.get(2) ?? "");
      setWinner3(byPlace.get(3) ?? "");
      setWinner4(byPlace.get(4) ?? "");
    } catch (e: any) {
      setErr(e?.message || "load_failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadRegistry() {
    try {
      const res = await fetch(`/api/doostaneh/player-registry`, { cache: "no-store" });
      const j = await res.json();
      if (j?.ok) setRegistry(j.players || []);
    } catch {}
  }

  useEffect(() => {
    if (!sessionId) return;
    refresh();
    loadRegistry();
  }, [sessionId]);

  const byPlayer = useMemo(() => {
    const m = new Map<string, { buyin: number; rebuy: number; addon: number }>();
    for (const p of players) {
      m.set(p.player_id, { buyin: 0, rebuy: 0, addon: 0 });
    }
    for (const e of entries) {
      const pid = e.registry_player_id;
      if (!pid) continue;
      if (!m.has(pid)) m.set(pid, { buyin: 0, rebuy: 0, addon: 0 });
      const cur = m.get(pid)!;
      if (e.type === "buyin") cur.buyin += Number(e.amount_usd || 0);
      if (e.type === "rebuy") cur.rebuy += Number(e.amount_usd || 0);
      if (e.type === "addon") cur.addon += Number(e.amount_usd || 0);
    }
    return m;
  }, [players, entries]);

  // Draft-state version of byPlayer — drives live totals and table display
  const draftByPlayer = useMemo(() => {
    const m = new Map<string, { buyin: number; rebuy: number; addon: number }>();
    for (const pid of draftPlayed) {
      const server = byPlayer.get(pid);
      const buyin = server?.buyin ?? 10; // default buy-in $10 for new players
      const rebuys = draftRebuys.get(pid) ?? 0;
      const addon = draftAddon.get(pid) ? 5 : 0;
      m.set(pid, { buyin, rebuy: rebuys * 5, addon });
    }
    return m;
  }, [draftPlayed, draftRebuys, draftAddon, byPlayer]);

  const totals = useMemo(() => {
    let total = 0;
    for (const [, v] of draftByPlayer.entries()) {
      total += (v.buyin || 0) + (v.rebuy || 0) + (v.addon || 0);
    }
    const charity = total < 80 ? 10 : 20;
    const prizePool = total - charity;
    return { total, charity, prizePool };
  }, [draftByPlayer]);

  // Auto-sync charity to DB whenever it changes (fire-and-forget)
  useEffect(() => {
    if (!sessionId || !session?.id) return;
    if (prevCharityRef.current === totals.charity) return;
    prevCharityRef.current = totals.charity;
    fetch(`/api/doostaneh/sessions/${sessionId}/set-charity`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ charity_usd: totals.charity }),
    }).catch(() => {});
  }, [totals.charity, sessionId, session?.id, isLockedOrComputed]);

  // Derive winner count from prize pool
  const winnerCount = totals.prizePool <= 70 ? 2 : totals.prizePool <= 100 ? 3 : 4;

  const payoutLabel =
    winnerCount === 2
      ? "2 winners: 65% / 35%"
      : winnerCount === 3
      ? "3 winners: 50% / 30% / 20%"
      : "4 winners: 50% / 25% / 15% / 10%";

  const payoutRows = useMemo(() => {
    return ledger
      .filter((l) => l.txn_type === "payout")
      .sort((a, b) => Number(b.delta_usd) - Number(a.delta_usd));
  }, [ledger]);

  async function post(path: string, body: any) {
    setErr(null);
    setBusy(path);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const j = await res.json();
      if (!j?.ok) throw new Error(j?.error || "request_failed");
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "request_failed");
    } finally {
      setBusy(null);
    }
  }

  function togglePlayed(playerId: string, checked: boolean) {
    setSaveState("idle");
    setDraftPlayed((prev) => {
      const next = new Set(prev);
      if (checked) next.add(playerId); else next.delete(playerId);
      return next;
    });
    if (checked) {
      setDraftAddon((prev) => new Map(prev).set(playerId, true));
      setDraftRebuys((prev) => { const m = new Map(prev); if (!m.has(playerId)) m.set(playerId, 0); return m; });
    } else {
      setDraftAddon((prev) => { const m = new Map(prev); m.delete(playerId); return m; });
      setDraftRebuys((prev) => { const m = new Map(prev); m.delete(playerId); return m; });
    }
  }

  function cycleRebuys(playerId: string) {
    setSaveState("idle");
    setDraftRebuys((prev) => {
      const cur = prev.get(playerId) ?? 0;
      return new Map(prev).set(playerId, (cur + 1) % 3);
    });
  }

  function toggleAddon(playerId: string, checked: boolean) {
    setSaveState("idle");
    setDraftAddon((prev) => new Map(prev).set(playerId, checked));
  }

  async function saveChanges() {
    setSaveState("saving");
    setErr(null);
    try {
      const apiPost = async (path: string, body: any) => {
        const res = await fetch(path, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const j = await res.json();
        if (!j?.ok) throw new Error(j?.error || "request_failed");
      };

      // Removed players
      for (const pid of serverPlayedIds) {
        if (!draftPlayed.has(pid)) {
          await apiPost(`/api/doostaneh/sessions/${sessionId}/remove-player`, { player_id: pid });
        }
      }

      // Added players
      for (const pid of draftPlayed) {
        if (!serverPlayedIds.has(pid)) {
          await apiPost(`/api/doostaneh/sessions/${sessionId}/add-player`, { player_id: pid });
        }
      }

      // Rebuys and addon for all draft players
      for (const pid of draftPlayed) {
        const serverRebuy = Math.min(2, Math.max(0, Math.round((byPlayer.get(pid)?.rebuy ?? 0) / 5)));
        const draftRebuy = draftRebuys.get(pid) ?? 0;
        if (draftRebuy !== serverRebuy || !serverPlayedIds.has(pid)) {
          await apiPost(`/api/doostaneh/sessions/${sessionId}/set-rebuys`, { player_id: pid, rebuys: draftRebuy });
        }

        const serverAddon = (byPlayer.get(pid)?.addon ?? 0) > 0;
        const draftAddonVal = draftAddon.get(pid) ?? false;
        if (draftAddonVal !== serverAddon || !serverPlayedIds.has(pid)) {
          await apiPost(`/api/doostaneh/sessions/${sessionId}/set-addon`, { player_id: pid, enabled: draftAddonVal });
        }
      }

      // Silent refresh — update server state without resetting winners or showing spinner
      const res = await fetch(`/api/doostaneh/sessions/${sessionId}/entry-state`, { cache: "no-store" });
      const j = await res.json();
      if (j?.ok) {
        setSession(j.session);
        setPlayers(j.players || []);
        setEntries(j.entries || []);
        setLedger(j.ledger || []);
      }

      setSaveState("saved");
    } catch (e: any) {
      setErr(e?.message || "save_failed");
      setSaveState("idle");
    }
  }

  async function setPlace(place: number, playerId: string) {
    if (!playerId) return;
    await post(`/api/doostaneh/sessions/${sessionId}/set-place`, { player_id: playerId, place });
  }

  async function deleteTournament() {
    if (!window.confirm("Delete this tournament? This cannot be undone.")) return;
    setBusy("delete");
    const res = await fetch(`/api/doostaneh/sessions/${sessionId}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(json?.error || "Failed to delete tournament.");
      setBusy(null);
      return;
    }
    window.location.href = "/dashboard/doostaneh";
  }

  const serverPlayedIds = useMemo(() => new Set(players.map((p) => p.player_id)), [players]);

  const hasChanges = useMemo(() => {
    // Check if set of played players changed
    if (draftPlayed.size !== serverPlayedIds.size) return true;
    for (const pid of draftPlayed) {
      if (!serverPlayedIds.has(pid)) return true;
    }
    // Check rebuys/addon for existing players
    for (const pid of serverPlayedIds) {
      const serverRebuy = Math.min(2, Math.max(0, Math.round((byPlayer.get(pid)?.rebuy ?? 0) / 5)));
      const serverAddon = (byPlayer.get(pid)?.addon ?? 0) > 0;
      if ((draftRebuys.get(pid) ?? 0) !== serverRebuy) return true;
      if ((draftAddon.get(pid) ?? false) !== serverAddon) return true;
    }
    return false;
  }, [draftPlayed, draftRebuys, draftAddon, serverPlayedIds, byPlayer]);

  const inSessionOptions = useMemo(() => {
    return [...draftPlayed]
      .map((pid) => {
        const serverRow = players.find((p) => p.player_id === pid);
        const reg = registry.find((r) => r.id === pid) ?? { id: pid, full_name: null, email: null };
        return {
          player_id: pid,
          finish_place: serverRow?.finish_place ?? null,
          player_registry: reg,
        };
      })
      .sort((a, b) =>
        String(a.player_registry?.full_name ?? "").localeCompare(
          String(b.player_registry?.full_name ?? "")
        )
      );
  }, [draftPlayed, players, registry]);

  const sortedRegistry = useMemo(() => {
    return [...registry].sort((a, b) =>
      String(a.full_name ?? "").localeCompare(String(b.full_name ?? ""))
    );
  }, [registry]);

  const sessionSummaryRows = useMemo(() => {
    return inSessionOptions.map((p) => {
      const values = byPlayer.get(p.player_id) ?? { buyin: 0, rebuy: 0, addon: 0 };
      const spent = (values.buyin || 0) + (values.rebuy || 0) + (values.addon || 0);
      const payout = ledger
        .filter((l) => l.txn_type === "payout" && l.registry_player_id === p.player_id)
        .reduce((sum, l) => sum + Number(l.delta_usd || 0), 0);
      return {
        playerId: p.player_id,
        fullName: p.player_registry?.full_name ?? "(no name)",
        spent,
        payout,
        net: payout - spent,
      };
    });
  }, [inSessionOptions, byPlayer, ledger]);

  const rankedSessionSummaryRows = useMemo(() => {
    return [...sessionSummaryRows].sort((a, b) => {
      if (b.net !== a.net) return b.net - a.net;
      if (b.payout !== a.payout) return b.payout - a.payout;
      return a.fullName.localeCompare(b.fullName);
    });
  }, [sessionSummaryRows]);

  const summaryTotals = useMemo(() => {
    const totalSpent = sessionSummaryRows.reduce((sum, row) => sum + row.spent, 0);
    const totalPayout = sessionSummaryRows.reduce((sum, row) => sum + row.payout, 0);
    return { totalSpent, totalPayout };
  }, [sessionSummaryRows]);

  const cellStyle: React.CSSProperties = {
    padding: "12px 10px",
    borderBottom: "1px solid #F0EBE2",
  };

  const thStyle: React.CSSProperties = {
    padding: "10px 10px",
    borderBottom: "1px solid #E6E0D5",
    fontSize: 12,
    fontWeight: 800,
    color: "#6A746F",
    textAlign: "left",
  };

  return (
    <div
      style={{
        minHeight: "100%",
        background: "linear-gradient(180deg, #FAF6EF 0%, #F7F1E7 100%)",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>

        {/* ── SECTION 1: HEADER ── */}
        <div
          style={{
            background: "#FFFCF7",
            border: "1px solid #E3E0D8",
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 16px 40px rgba(31, 42, 55, 0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 1.1,
                  textTransform: "uppercase",
                  color: "#C89B3C",
                }}
              >
                Persian Men Society
              </div>

              <h1
                style={{
                  fontSize: 34,
                  lineHeight: 1.1,
                  fontWeight: 900,
                  margin: "8px 0 0 0",
                  color: "#17342D",
                }}
              >
                Doostaneh Session
              </h1>

              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Badge label={`Session: ${sessionId?.slice(0, 8) ?? ""}`} />
                {session?.external_game_id && (
                  <Badge label={`Game: ${session.external_game_id}`} tone="gold" />
                )}
                {session?.tournament_number != null && (
                  <Badge label={`#: ${session.tournament_number}`} tone="gold" />
                )}
                {session?.starts_at && (
                  <Badge
                    label={new Date(session.starts_at).toLocaleString()}
                    tone="green"
                  />
                )}
                {session?.status && (
                  <Badge label={`Status: ${session.status}`} tone="neutral" />
                )}
              </div>

              <div style={{ marginTop: 14, display: "flex", gap: 16, flexWrap: "wrap" }}>
                <Link
                  href={`/dashboard/doostaneh?session=${sessionId}`}
                  style={{ color: "#1F7A63", fontWeight: 800, textDecoration: "none" }}
                >
                  ← Back to Doostaneh
                </Link>
                <Link
                  href={`/dashboard/admin/audit?session=${sessionId}`}
                  style={{ color: "#1F7A63", fontWeight: 800, textDecoration: "none" }}
                >
                  View in Audit Log
                </Link>

                {["open", "active", "locked"].includes(session?.status ?? "") && (
                  <button
                    type="button"
                    onClick={deleteTournament}
                    disabled={!!busy}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 12,
                      border: "1px solid #8B1E2D",
                      background: "#FFF3F4",
                      color: "#8B1E2D",
                      fontWeight: 900,
                      fontSize: 13,
                      cursor: !!busy ? "not-allowed" : "pointer",
                      opacity: !!busy ? 0.7 : 1,
                    }}
                  >
                    {busy === "delete" ? "Deleting..." : "Delete Tournament"}
                  </button>
                )}
              </div>
            </div>

            <div style={{ width: "100%", maxWidth: 340 }}>
              <SectionCard
                title="Session Actions"
                subtitle="Lock, unlock, or compute payouts for this tournament."
              >
                <div
                  style={{
                    marginBottom: 12,
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: "#F8F3EA",
                    border: "1px solid #E3E0D8",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#6A746F",
                  }}
                >
                  {payoutLabel}
                </div>
                <ComputeButton
                  sessionId={sessionId}
                  groupKey="doostaneh"
                  onChanged={refresh}
                  previewData={{
                    totalCollected: totals.total,
                    charity: totals.charity,
                    prizePool: totals.prizePool,
                    payoutLabel,
                    winners: [
                      winner1 ? { place: 1, name: inSessionOptions.find((p) => p.player_id === winner1)?.player_registry?.full_name ?? "?" } : null,
                      winner2 ? { place: 2, name: inSessionOptions.find((p) => p.player_id === winner2)?.player_registry?.full_name ?? "?" } : null,
                      winnerCount >= 3 && winner3 ? { place: 3, name: inSessionOptions.find((p) => p.player_id === winner3)?.player_registry?.full_name ?? "?" } : null,
                      winnerCount >= 4 && winner4 ? { place: 4, name: inSessionOptions.find((p) => p.player_id === winner4)?.player_registry?.full_name ?? "?" } : null,
                    ].filter((w): w is { place: number; name: string } => w !== null),
                    wasAlreadyComputed: session?.status === "computed",
                  }}
                />
              </SectionCard>
            </div>
          </div>
        </div>

        {err && (
          <div
            style={{
              marginTop: 18,
              border: "1px solid #E9C8CF",
              background: "#FDF0F2",
              color: "#8B1E2D",
              borderRadius: 16,
              padding: 14,
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Error: {err}
          </div>
        )}

        {/* ── SECTION 2: PLAYER TABLE ── */}
        <div style={{ marginTop: 18 }}>
          <SectionCard
            title="Tournament Entry"
            subtitle="Check 'Played' for each participant. Rebuys cost $5 each. Add-on is +$5."
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, paddingLeft: 4, width: 60 }}>Played</th>
                    <th style={thStyle}>Player</th>
                    <th style={thStyle}>Rebuys</th>
                    <th style={{ ...thStyle, width: 80 }}>Add-on</th>
                    <th style={{ ...thStyle, textAlign: "right", width: 80 }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} style={{ ...cellStyle, fontSize: 14, color: "#6A746F" }}>
                        Loading...
                      </td>
                    </tr>
                  ) : sortedRegistry.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ ...cellStyle, fontSize: 14, color: "#6A746F" }}>
                        No players in registry.
                      </td>
                    </tr>
                  ) : (
                    sortedRegistry.map((player) => {
                      const played = draftPlayed.has(player.id);
                      const v = draftByPlayer.get(player.id) ?? { buyin: 0, rebuy: 0, addon: 0 };
                      const rebuyCount = draftRebuys.get(player.id) ?? 0;
                      const hasAddon = draftAddon.get(player.id) ?? false;
                      const rowTotal = played
                        ? (v.buyin || 0) + (v.rebuy || 0) + (v.addon || 0)
                        : 0;
                      const controlsDisabled = !played || saveState === "saving";

                      return (
                        <tr
                          key={player.id}
                          style={{ background: played ? "#F4FAF7" : "transparent" }}
                        >
                          {/* Played checkbox */}
                          <td style={{ ...cellStyle, paddingLeft: 4, textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={played}
                              disabled={saveState === "saving"}
                              onChange={(e) => togglePlayed(player.id, e.target.checked)}
                              style={{
                                width: 16,
                                height: 16,
                                cursor: saveState === "saving" ? "not-allowed" : "pointer",
                                accentColor: "#1F7A63",
                              }}
                            />
                          </td>

                          {/* Player name */}
                          <td
                            style={{
                              ...cellStyle,
                              fontWeight: played ? 900 : 400,
                              color: played ? "#17342D" : "#9AA3A0",
                            }}
                          >
                            {player.full_name ?? "(no name)"}
                          </td>

                          {/* Rebuys cycling button */}
                          <td style={cellStyle}>
                            <button
                              disabled={controlsDisabled}
                              onClick={() => cycleRebuys(player.id)}
                              style={{
                                padding: "5px 16px",
                                borderRadius: 999,
                                border: "none",
                                fontWeight: 800,
                                fontSize: 13,
                                cursor: controlsDisabled ? "not-allowed" : "pointer",
                                opacity: controlsDisabled ? 0.5 : 1,
                                background:
                                  rebuyCount === 0 ? "#E3E0D8" :
                                  rebuyCount === 1 ? "#1F7A63" : "#D4762A",
                                color: rebuyCount === 0 ? "#6A746F" : "#FFFFFF",
                              }}
                            >
                              {rebuyCount}
                            </button>
                          </td>

                          {/* Add-on checkbox */}
                          <td style={{ ...cellStyle, textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={hasAddon}
                              disabled={controlsDisabled}
                              onChange={(e) => toggleAddon(player.id, e.target.checked)}
                              style={{
                                width: 16,
                                height: 16,
                                cursor: controlsDisabled ? "not-allowed" : "pointer",
                                accentColor: "#1F7A63",
                              }}
                            />
                          </td>

                          {/* Total */}
                          <td
                            style={{
                              ...cellStyle,
                              textAlign: "right",
                              fontWeight: 900,
                              color: played ? "#17342D" : "#C5CCC9",
                            }}
                          >
                            {played ? `$${rowTotal.toFixed(2)}` : "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Live totals */}
            <div
              style={{
                marginTop: 16,
                padding: "14px 18px",
                borderRadius: 14,
                background: "#F8F3EA",
                border: "1px solid #E3E0D8",
                display: "flex",
                gap: 28,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#6A746F",
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                  }}
                >
                  Total Collected
                </div>
                <div
                  style={{ fontSize: 22, fontWeight: 900, color: "#17342D", marginTop: 2 }}
                >
                  ${totals.total.toFixed(2)}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#6A746F",
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                  }}
                >
                  Charity
                </div>
                <div
                  style={{ fontSize: 22, fontWeight: 900, color: "#C89B3C", marginTop: 2 }}
                >
                  ${totals.charity.toFixed(2)}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#6A746F",
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                  }}
                >
                  Prize Pool
                </div>
                <div
                  style={{ fontSize: 22, fontWeight: 900, color: "#1F7A63", marginTop: 2 }}
                >
                  ${totals.prizePool.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Save Changes button */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button
                onClick={saveChanges}
                disabled={saveState === "saving" || (!hasChanges && saveState !== "saved")}
                style={{
                  padding: "10px 22px",
                  borderRadius: 12,
                  border: "none",
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: saveState === "saving" || (!hasChanges && saveState !== "saved") ? "not-allowed" : "pointer",
                  background: saveState === "saved" && !hasChanges ? "#1F7A63" : hasChanges || saveState === "saving" ? "#86efac" : "#E3E0D8",
                  color: saveState === "saved" && !hasChanges ? "#ffffff" : hasChanges || saveState === "saving" ? "#14532d" : "#9AA3A0",
                  opacity: saveState === "saving" ? 0.7 : 1,
                }}
              >
                {saveState === "saving" ? "Saving..." : saveState === "saved" && !hasChanges ? "Saved ✓" : "Save Changes"}
              </button>
            </div>
          </SectionCard>
        </div>

        {/* ── SECTION 3: WINNERS ── */}
        <div style={{ marginTop: 18 }}>
          <SectionCard title="Winners" subtitle="Set finish places before computing payouts.">
            <div
              style={{
                marginBottom: 16,
                padding: "10px 14px",
                borderRadius: 12,
                background: "#F8F3EA",
                border: "1px solid #E3E0D8",
                fontSize: 13,
                fontWeight: 700,
                color: "#6A746F",
              }}
            >
              Prize Pool:{" "}
              <strong style={{ color: "#1F7A63" }}>${totals.prizePool.toFixed(2)}</strong>
              {" · "}
              Auto split:{" "}
              <strong style={{ color: "#17342D" }}>{payoutLabel}</strong>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {/* 1st place */}
              <div>
                <div style={{ fontSize: 13, marginBottom: 6, fontWeight: 700, color: "#4E5B55" }}>
                  1st place
                </div>
                <select
                  value={winner1}
                  onChange={(e) => { setWinner1(e.target.value); setPlace(1, e.target.value); }}
                  disabled={!!busy}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "1px solid #D9D3C7",
                    background: "#F8F3EA",
                    color: "#17342D",
                    fontSize: 14,
                    opacity: busy || isLockedOrComputed ? 0.7 : 1,
                  }}
                >
                  <option value="">Select player</option>
                  {inSessionOptions.map((p) => (
                    <option key={p.player_id} value={p.player_id}>
                      {p.player_registry?.full_name ?? "(no name)"}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2nd place */}
              <div>
                <div style={{ fontSize: 13, marginBottom: 6, fontWeight: 700, color: "#4E5B55" }}>
                  2nd place
                </div>
                <select
                  value={winner2}
                  onChange={(e) => { setWinner2(e.target.value); setPlace(2, e.target.value); }}
                  disabled={!!busy}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "1px solid #D9D3C7",
                    background: "#F8F3EA",
                    color: "#17342D",
                    fontSize: 14,
                    opacity: busy || isLockedOrComputed ? 0.7 : 1,
                  }}
                >
                  <option value="">Select player</option>
                  {inSessionOptions.map((p) => (
                    <option key={p.player_id} value={p.player_id}>
                      {p.player_registry?.full_name ?? "(no name)"}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3rd place — shown when prize pool > $70 */}
              {winnerCount >= 3 && (
                <div>
                  <div style={{ fontSize: 13, marginBottom: 6, fontWeight: 700, color: "#4E5B55" }}>
                    3rd place
                  </div>
                  <select
                    value={winner3}
                    onChange={(e) => { setWinner3(e.target.value); setPlace(3, e.target.value); }}
                    disabled={!!busy}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: "1px solid #D9D3C7",
                      background: "#F8F3EA",
                      color: "#17342D",
                      fontSize: 14,
                      opacity: busy || isLockedOrComputed ? 0.7 : 1,
                    }}
                  >
                    <option value="">Select player</option>
                    {inSessionOptions.map((p) => (
                      <option key={p.player_id} value={p.player_id}>
                        {p.player_registry?.full_name ?? "(no name)"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 4th place — shown when prize pool > $100 */}
              {winnerCount >= 4 && (
                <div>
                  <div style={{ fontSize: 13, marginBottom: 6, fontWeight: 700, color: "#4E5B55" }}>
                    4th place
                  </div>
                  <select
                    value={winner4}
                    onChange={(e) => { setWinner4(e.target.value); setPlace(4, e.target.value); }}
                    disabled={!!busy}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: "1px solid #D9D3C7",
                      background: "#F8F3EA",
                      color: "#17342D",
                      fontSize: 14,
                      opacity: busy || isLockedOrComputed ? 0.7 : 1,
                    }}
                  >
                    <option value="">Select player</option>
                    {inSessionOptions.map((p) => (
                      <option key={p.player_id} value={p.player_id}>
                        {p.player_registry?.full_name ?? "(no name)"}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* ── SESSION SUMMARY ── */}
        <div style={{ marginTop: 18 }}>
          <SectionCard
            title="Session Summary"
            subtitle="Players ranked by net result for this game."
          >
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
              <Badge
                label={`Total Spent: $${summaryTotals.totalSpent.toFixed(2)}`}
                tone="neutral"
              />
              <Badge
                label={`Total Payout: $${summaryTotals.totalPayout.toFixed(2)}`}
                tone="green"
              />
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr style={{ textAlign: "left", fontSize: 12, color: "#17342D" }}>
                    <th style={{ padding: "12px 10px", borderBottom: "1px solid #E6E0D5" }}>Rank</th>
                    <th style={{ padding: "12px 10px", borderBottom: "1px solid #E6E0D5" }}>Player</th>
                    <th style={{ padding: "12px 10px", borderBottom: "1px solid #E6E0D5" }}>Spent</th>
                    <th style={{ padding: "12px 10px", borderBottom: "1px solid #E6E0D5" }}>Payout</th>
                    <th style={{ padding: "12px 10px", borderBottom: "1px solid #E6E0D5" }}>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedSessionSummaryRows.map((row, index) => {
                    const rowBg =
                      index === 0 ? "#FBF6EA" : index === 1 ? "#FCF9F2" : index === 2 ? "#FFFCF7" : "transparent";
                    const rankLabel =
                      index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}`;

                    return (
                      <tr key={row.playerId} style={{ background: rowBg }}>
                        <td
                          style={{
                            padding: "14px 10px",
                            borderBottom: "1px solid #F0EBE2",
                            fontWeight: 900,
                            color: "#8A6A1F",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {rankLabel}
                        </td>
                        <td
                          style={{
                            padding: "14px 10px",
                            borderBottom: "1px solid #F0EBE2",
                            fontWeight: 900,
                            color: "#17342D",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span>{row.fullName}</span>
                            {row.payout > 0 ? <Badge label="Winner" tone="gold" /> : null}
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "14px 10px",
                            borderBottom: "1px solid #F0EBE2",
                            color: "#4E5B55",
                            fontWeight: 700,
                          }}
                        >
                          ${row.spent.toFixed(2)}
                        </td>
                        <td
                          style={{
                            padding: "14px 10px",
                            borderBottom: "1px solid #F0EBE2",
                            color: "#1F7A63",
                            fontWeight: 700,
                          }}
                        >
                          ${row.payout.toFixed(2)}
                        </td>
                        <td
                          style={{
                            padding: "14px 10px",
                            borderBottom: "1px solid #F0EBE2",
                            fontWeight: 900,
                            color: row.net >= 0 ? "#1F7A63" : "#8B1E2D",
                          }}
                        >
                          {row.net > 0 ? "+" : ""}${row.net.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        {/* ── TOURNAMENT RESULTS ── */}
        {payoutRows.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <SectionCard
              title="Tournament Results"
              subtitle="Final payouts and charity distribution."
            >
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                <Badge
                  label={`Tournament Date: ${
                    session?.starts_at ? new Date(session.starts_at).toLocaleDateString() : "-"
                  }`}
                  tone="neutral"
                />
                <Badge label={`Prize Pool: $${totals.prizePool.toFixed(2)}`} tone="green" />
                <Badge label={`Charity: $${totals.charity.toFixed(2)}`} tone="gold" />
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {payoutRows.map((l, i) => {
                  const player = players.find((p) => p.player_id === l.registry_player_id);
                  const placeLabel =
                    i === 0 ? "1st Place" : i === 1 ? "2nd Place" : i === 2 ? "3rd Place" : `${i + 1}th Place`;

                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "14px 16px",
                        border: "1px solid #E3E0D8",
                        borderRadius: 14,
                        background: "#F8F3EA",
                      }}
                    >
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <Badge label={placeLabel} tone="gold" />
                        <div style={{ fontWeight: 900, fontSize: 15, color: "#17342D" }}>
                          {player?.player_registry?.full_name || "Player"}
                        </div>
                      </div>
                      <div style={{ fontWeight: 900, fontSize: 16, color: "#1F7A63" }}>
                        ${Number(l.delta_usd).toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </div>
        )}

        {/* ── ADMIN ACTIVITY ── */}
        <div style={{ marginTop: 18 }}>
          <SectionCard title="Admin Activity" subtitle="Recent system actions for this group.">
            <AdminActivity groupKey="doostaneh" />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
