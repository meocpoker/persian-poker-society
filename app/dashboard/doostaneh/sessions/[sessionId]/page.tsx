"use client";

import React, { useEffect, useMemo, useState } from "react";
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
    neutral: {
      border: "1px solid #D9D3C7",
      background: "#F8F3EA",
      color: "#4E5B55",
    },
    green: {
      border: "1px solid #B9D7CF",
      background: "#EDF7F4",
      color: "#1F7A63",
    },
    gold: {
      border: "1px solid #E5D2A1",
      background: "#FBF6EA",
      color: "#8A6A1F",
    },
    red: {
      border: "1px solid #E9C8CF",
      background: "#FDF0F2",
      color: "#8B1E2D",
    },
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
      <div style={{ fontSize: 18, fontWeight: 900, color: "#17342D" }}>
        {title}
      </div>
      {subtitle ? (
        <div style={{ fontSize: 13, color: "#6A746F", marginTop: 6 }}>
          {subtitle}
        </div>
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
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");

  const [winnerCount, setWinnerCount] = useState<number>(3);
  const [winner1, setWinner1] = useState<string>("");
  const [winner2, setWinner2] = useState<string>("");
  const [winner3, setWinner3] = useState<string>("");
  const [winner4, setWinner4] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

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

      const wc = Number(j.session?.doostaneh_winner_count ?? 3);
      setWinnerCount([2, 3, 4].includes(wc) ? wc : 3);

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

  const totals = useMemo(() => {
    let total = 0;

    for (const [, v] of byPlayer.entries()) {
      total += (v.buyin || 0) + (v.rebuy || 0) + (v.addon || 0);
    }

    const suggestedCharity = total < 80 ? 10 : 20;
    const charity = session?.charity_usd ?? suggestedCharity;
    const prizePool = total - charity;

    return { total, suggestedCharity, charity, prizePool };
  }, [byPlayer, session?.charity_usd]);

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

  async function addPlayer() {
    if (!selectedPlayerId) return;
    await post(`/api/doostaneh/sessions/${sessionId}/add-player`, {
      player_id: selectedPlayerId,
    });
    setSelectedPlayerId("");
  }

  async function removePlayer(playerId: string) {
    await post(`/api/doostaneh/sessions/${sessionId}/remove-player`, {
      player_id: playerId,
    });
  }

  async function setRebuys(playerId: string, rebuys: number) {
    await post(`/api/doostaneh/sessions/${sessionId}/set-rebuys`, {
      player_id: playerId,
      rebuys,
    });
  }

  async function setAddon(playerId: string, enabled: boolean) {
    await post(`/api/doostaneh/sessions/${sessionId}/set-addon`, {
      player_id: playerId,
      enabled,
    });
  }

  async function setCharity(charityUsd: number) {
    await post(`/api/doostaneh/sessions/${sessionId}/set-charity`, {
      charity_usd: charityUsd,
    });
  }

  async function setPlace(place: number, playerId: string) {
    if (!playerId) return;
    await post(`/api/doostaneh/sessions/${sessionId}/set-place`, {
      player_id: playerId,
      place,
    });
  }

  const playerIdsInSession = new Set(players.map((p) => p.player_id));
  const addable = registry.filter((p) => !playerIdsInSession.has(p.id));

  const inSessionOptions = players
    .slice()
    .sort((a, b) =>
      String(a.player_registry?.full_name ?? "").localeCompare(
        String(b.player_registry?.full_name ?? "")
      )
    );

  return (
    <div
      style={{
        minHeight: "100%",
        background: "linear-gradient(180deg, #FAF6EF 0%, #F7F1E7 100%)",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
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
                {session?.tournament_number != null && (
                  <Badge label={`Game #: ${session.tournament_number}`} tone="gold" />
                )}
                {session?.starts_at && (
                  <Badge
                    label={`Starts: ${new Date(session.starts_at).toLocaleString()}`}
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
              </div>
            </div>

            <div style={{ width: "100%", maxWidth: 340 }}>
              <SectionCard
                title="Session Actions"
                subtitle="Lock, unlock, or compute payouts for this tournament."
              >
                <ComputeButton
                  sessionId={sessionId}
                  groupKey="doostaneh"
                  onChanged={refresh}
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

        <div style={{ marginTop: 18 }}>
          <SectionCard
            title="Tournament Entry"
            subtitle="Adding a player auto-posts the $5 buy-in. Rebuys can be 0, 1, or 2. Add-on is a one-time $5."
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                  width: "100%",
                }}
              >
                <select
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  disabled={isLockedOrComputed || !!busy}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "1px solid #D9D3C7",
                    background: "#F8F3EA",
                    color: "#17342D",
                    minWidth: 260,
                    fontSize: 14,
                    opacity: isLockedOrComputed || busy ? 0.7 : 1,
                  }}
                >
                  <option value="">Add player...</option>
                  {addable.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name ?? "(no name)"}
                    </option>
                  ))}
                </select>

                <button
                  onClick={addPlayer}
                  disabled={!selectedPlayerId || !!busy || isLockedOrComputed}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 14,
                    border: "1px solid #1F7A63",
                    background: "#1F7A63",
                    color: "#FFFDF8",
                    fontWeight: 900,
                    cursor: "pointer",
                    opacity: !selectedPlayerId || busy || isLockedOrComputed ? 0.6 : 1,
                  }}
                >
                  {busy?.includes("add-player") ? "Adding..." : "Add Player"}
                </button>
              </div>
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Badge label={`Total Collected: $${totals.total.toFixed(2)}`} tone="green" />
              <Badge
                label={`Suggested Charity: $${totals.suggestedCharity.toFixed(2)}`}
                tone="gold"
              />
              <Badge label={`Charity: $${totals.charity.toFixed(2)}`} />
              <Badge label={`Prize Pool: $${totals.prizePool.toFixed(2)}`} tone="green" />
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: 13, color: "#6A746F", fontWeight: 700 }}>
                Set charity:
              </div>
              <input
                type="number"
                step="0.01"
                defaultValue={totals.charity}
                disabled={isLockedOrComputed || !!busy}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v)) setCharity(v);
                }}
                style={{
                  width: 150,
                  padding: "11px 12px",
                  borderRadius: 14,
                  border: "1px solid #D9D3C7",
                  background: "#F8F3EA",
                  color: "#17342D",
                  opacity: isLockedOrComputed || busy ? 0.7 : 1,
                }}
              />
              <div style={{ fontSize: 12, color: "#7A7368" }}>
                {isLockedOrComputed ? "Locked" : "Editable"}
              </div>
            </div>

            <div style={{ marginTop: 18, overflowX: "auto" }}>
              {loading ? (
                <div style={{ fontSize: 14, color: "#6A746F" }}>Loading...</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                  <thead>
                    <tr style={{ textAlign: "left", fontSize: 12, color: "#6A746F" }}>
                      <th style={{ padding: "12px 10px", borderBottom: "1px solid #E6E0D5" }}>
                        Player
                      </th>
                      <th style={{ padding: "12px 10px", borderBottom: "1px solid #E6E0D5" }}>
                        Buy-in
                      </th>
                      <th style={{ padding: "12px 10px", borderBottom: "1px solid #E6E0D5" }}>
                        Rebuys
                      </th>
                      <th style={{ padding: "12px 10px", borderBottom: "1px solid #E6E0D5" }}>
                        Add-on
                      </th>
                      <th style={{ padding: "12px 10px", borderBottom: "1px solid #E6E0D5" }}>
                        Total
                      </th>
                      <th style={{ padding: "12px 10px", borderBottom: "1px solid #E6E0D5" }} />
                    </tr>
                  </thead>
                  <tbody>
                    {inSessionOptions.map((p) => {
                      const v = byPlayer.get(p.player_id) ?? { buyin: 0, rebuy: 0, addon: 0 };
                      const rebuyCount = Math.min(2, Math.max(0, Math.round((v.rebuy || 0) / 5)));
                      const hasAddon = (v.addon || 0) > 0;
                      const total = (v.buyin || 0) + (v.rebuy || 0) + (v.addon || 0);

                      return (
                        <tr key={p.player_id}>
                          <td
                            style={{
                              padding: "14px 10px",
                              borderBottom: "1px solid #F0EBE2",
                              fontWeight: 900,
                              color: "#17342D",
                            }}
                          >
                            {p.player_registry?.full_name ?? "(no name)"}
                          </td>
                          <td
                            style={{
                              padding: "14px 10px",
                              borderBottom: "1px solid #F0EBE2",
                              color: "#4E5B55",
                            }}
                          >
                            ${(v.buyin || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: "14px 10px", borderBottom: "1px solid #F0EBE2" }}>
                            <select
                              value={String(rebuyCount)}
                              onChange={(e) => setRebuys(p.player_id, Number(e.target.value))}
                              disabled={!!busy || isLockedOrComputed}
                              style={{
                                padding: "9px 10px",
                                borderRadius: 12,
                                border: "1px solid #D9D3C7",
                                background: "#F8F3EA",
                                color: "#17342D",
                                opacity: busy || isLockedOrComputed ? 0.7 : 1,
                              }}
                            >
                              <option value="0">0</option>
                              <option value="1">1</option>
                              <option value="2">2</option>
                            </select>
                            <span style={{ marginLeft: 10, fontSize: 12, color: "#7A7368" }}>
                              (${(v.rebuy || 0).toFixed(2)})
                            </span>
                          </td>
                          <td style={{ padding: "14px 10px", borderBottom: "1px solid #F0EBE2" }}>
                            <button
                              onClick={() => setAddon(p.player_id, !hasAddon)}
                              disabled={!!busy || isLockedOrComputed}
                              style={{
                                padding: "9px 12px",
                                borderRadius: 12,
                                border: hasAddon ? "1px solid #1F7A63" : "1px solid #D9D3C7",
                                background: hasAddon ? "#1F7A63" : "#FFFDF8",
                                color: hasAddon ? "#FFFDF8" : "#17342D",
                                fontWeight: 900,
                                cursor: "pointer",
                                opacity: busy || isLockedOrComputed ? 0.6 : 1,
                              }}
                            >
                              {hasAddon ? "Add-on ✓" : "Add add-on"}
                            </button>
                            <span style={{ marginLeft: 10, fontSize: 12, color: "#7A7368" }}>
                              (${(v.addon || 0).toFixed(2)})
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "14px 10px",
                              borderBottom: "1px solid #F0EBE2",
                              fontWeight: 900,
                              color: "#17342D",
                            }}
                          >
                            ${total.toFixed(2)}
                          </td>
                          <td style={{ padding: "14px 10px", borderBottom: "1px solid #F0EBE2" }}>
                            <button
                              onClick={() => removePlayer(p.player_id)}
                              disabled={!!busy || isLockedOrComputed}
                              style={{
                                padding: "9px 12px",
                                borderRadius: 12,
                                border: "1px solid #E4C7CD",
                                background: "#FFF3F4",
                                color: "#8B1E2D",
                                fontWeight: 900,
                                cursor: "pointer",
                                opacity: busy || isLockedOrComputed ? 0.6 : 1,
                              }}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </SectionCard>
        </div>

        <div style={{ marginTop: 18 }}>
          <SectionCard title="Winners" subtitle="Set finish places before computing payouts.">
            <div
              style={{
                marginTop: 2,
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: 13, color: "#6A746F", fontWeight: 700 }}>
                # winners:
              </div>
              <select
                value={String(winnerCount)}
                onChange={(e) => setWinnerCount(Number(e.target.value))}
                disabled={!!busy || isLockedOrComputed}
                style={{
                  padding: "9px 10px",
                  borderRadius: 12,
                  border: "1px solid #D9D3C7",
                  background: "#F8F3EA",
                  color: "#17342D",
                  opacity: busy || isLockedOrComputed ? 0.7 : 1,
                }}
              >
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </div>

            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              <div>
                <div
                  style={{ fontSize: 13, marginBottom: 6, fontWeight: 700, color: "#4E5B55" }}
                >
                  1st place
                </div>
                <select
                  value={winner1}
                  onChange={(e) => {
                    setWinner1(e.target.value);
                    setPlace(1, e.target.value);
                  }}
                  disabled={!!busy || isLockedOrComputed}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "1px solid #D9D3C7",
                    background: "#F8F3EA",
                    color: "#17342D",
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

              <div>
                <div
                  style={{ fontSize: 13, marginBottom: 6, fontWeight: 700, color: "#4E5B55" }}
                >
                  2nd place
                </div>
                <select
                  value={winner2}
                  onChange={(e) => {
                    setWinner2(e.target.value);
                    setPlace(2, e.target.value);
                  }}
                  disabled={!!busy || isLockedOrComputed}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "1px solid #D9D3C7",
                    background: "#F8F3EA",
                    color: "#17342D",
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

              {winnerCount >= 3 && (
                <div>
                  <div
                    style={{ fontSize: 13, marginBottom: 6, fontWeight: 700, color: "#4E5B55" }}
                  >
                    3rd place
                  </div>
                  <select
                    value={winner3}
                    onChange={(e) => {
                      setWinner3(e.target.value);
                      setPlace(3, e.target.value);
                    }}
                    disabled={!!busy || isLockedOrComputed}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: "1px solid #D9D3C7",
                      background: "#F8F3EA",
                      color: "#17342D",
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

              {winnerCount >= 4 && (
                <div>
                  <div
                    style={{ fontSize: 13, marginBottom: 6, fontWeight: 700, color: "#4E5B55" }}
                  >
                    4th place
                  </div>
                  <select
                    value={winner4}
                    onChange={(e) => {
                      setWinner4(e.target.value);
                      setPlace(4, e.target.value);
                    }}
                    disabled={!!busy || isLockedOrComputed}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: "1px solid #D9D3C7",
                      background: "#F8F3EA",
                      color: "#17342D",
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

        {payoutRows.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <SectionCard
              title="Tournament Results"
              subtitle="Final payouts and charity distribution."
            >
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                <Badge label={`Tournament Date: ${session?.starts_at ? new Date(session.starts_at).toLocaleDateString() : "-"}`} tone="neutral" />
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

                      <div
                        style={{
                          fontWeight: 900,
                          fontSize: 16,
                          color: "#1F7A63",
                        }}
                      >
                        ${Number(l.delta_usd).toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <SectionCard title="Admin Activity" subtitle="Recent system actions for this group.">
            <AdminActivity groupKey="doostaneh" />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}