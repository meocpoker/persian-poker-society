"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ComputeButton from "../../ComputeButton";
import AdminActivity from "../../AdminActivity";

function Badge({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid #334155",
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 0.2,
        background: "#0f172a",
        color: "#e2e8f0",
      }}
    >
      {label}
    </span>
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

export default function DoostanehSessionPage() {
  const params = useParams();
  const sessionId = params?.sessionId as string;

  const [session, setSession] = useState<Session | null>(null);
  const [players, setPlayers] = useState<SRPRow[]>([]);
  const [entries, setEntries] = useState<EntryRow[]>([]);
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

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/doostaneh/sessions/${sessionId}/entry-state`, { cache: "no-store" });
      const j = await res.json();
      if (!j?.ok) throw new Error(j?.error || "load_failed");

      setSession(j.session);
      setPlayers(j.players || []);
      setEntries(j.entries || []);

      const wc = Number(j.session?.doostaneh_winner_count ?? 3);
      setWinnerCount([2, 3, 4].includes(wc) ? wc : 3);

      // hydrate winners from finish_place if already set
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const byPlayer = useMemo(() => {
    const m = new Map<string, { buyin: number; rebuy: number; addon: number }>();
    for (const p of players) m.set(p.player_id, { buyin: 0, rebuy: 0, addon: 0 });

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
    for (const [_pid, v] of byPlayer.entries()) {
      total += (v.buyin || 0) + (v.rebuy || 0) + (v.addon || 0);
    }
    const suggestedCharity = total < 80 ? 10 : 20;
    const charity = session?.charity_usd ?? suggestedCharity;
    const prizePool = total - charity;
    return { total, suggestedCharity, charity, prizePool };
  }, [byPlayer, session?.charity_usd]);

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
    await post(`/api/doostaneh/sessions/${sessionId}/add-player`, { player_id: selectedPlayerId });
    setSelectedPlayerId("");
  }

  async function removePlayer(playerId: string) {
    await post(`/api/doostaneh/sessions/${sessionId}/remove-player`, { player_id: playerId });
  }

  async function setRebuys(playerId: string, rebuys: number) {
    await post(`/api/doostaneh/sessions/${sessionId}/set-rebuys`, { player_id: playerId, rebuys });
  }

  async function setAddon(playerId: string, enabled: boolean) {
    await post(`/api/doostaneh/sessions/${sessionId}/set-addon`, { player_id: playerId, enabled });
  }

  async function setCharity(charityUsd: number) {
    await post(`/api/doostaneh/sessions/${sessionId}/set-charity`, { charity_usd: charityUsd });
  }

  async function setPlace(place: number, playerId: string) {
    if (!playerId) return;
    await post(`/api/doostaneh/sessions/${sessionId}/set-place`, { player_id: playerId, place });
  }

  const playerIdsInSession = new Set(players.map((p) => p.player_id));
  const addable = registry.filter((p) => !playerIdsInSession.has(p.id));

  const inSessionOptions = players
    .slice()
    .sort((a, b) => String(a.player_registry?.full_name ?? "").localeCompare(String(b.player_registry?.full_name ?? "")));

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>Doostaneh Session</h1>

          <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Badge label={`Session: ${sessionId?.slice(0, 8) ?? ""}`} />
            {session?.tournament_number != null && <Badge label={`Game #: ${session.tournament_number}`} />}
            {session?.starts_at && <Badge label={`Starts: ${new Date(session.starts_at).toLocaleString()}`} />}
            {session?.status && <Badge label={`Status: ${session.status}`} />}
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Link href={`/dashboard/doostaneh?session=${sessionId}`} className="underline">
              Back to Doostaneh
            </Link>

            <Link href={`/dashboard/admin/audit?session=${sessionId}`} className="underline">
              View in Audit Log
            </Link>
          </div>
        </div>

        <div style={{ minWidth: 260, flex: "0 0 320px" }}>
          <div style={{ border: "1px solid #1f2937", borderRadius: 14, padding: 14, background: "#0b1220", color: "white" }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Session Actions</div>
            <div style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 12 }}>Compute Doostaneh payouts.</div>
            <ComputeButton sessionId={sessionId} groupKey="doostaneh" />
          </div>
        </div>
      </div>

      {/* ENTRY PANEL */}
      <div style={{ marginTop: 18, border: "1px solid #1f2937", borderRadius: 14, padding: 14, background: "#0b1220", color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900 }}>Tournament Entry</div>
            <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4 }}>
              Buy-in auto-adds $5 when you add a player. Rebuys (0/1/2) add $0/$5/$10. Add-on adds $5 (once).
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #334155", background: "#0f172a", color: "white", minWidth: 220 }}
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
              disabled={!selectedPlayerId || !!busy}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #1f2937", background: "#16a34a", color: "white", fontWeight: 900, cursor: "pointer", opacity: !selectedPlayerId || busy ? 0.6 : 1 }}
            >
              {busy?.includes("add-player") ? "Adding..." : "Add Player"}
            </button>
          </div>
        </div>

        {err && <div style={{ marginTop: 10, color: "#fecaca", fontSize: 12 }}>Error: {err}</div>}

        <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Badge label={`Total Collected: $${totals.total.toFixed(2)}`} />
          <Badge label={`Suggested Charity: $${totals.suggestedCharity.toFixed(2)}`} />
          <Badge label={`Charity (current): $${totals.charity.toFixed(2)}`} />
          <Badge label={`Prize Pool: $${totals.prizePool.toFixed(2)}`} />
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>Set charity:</div>
          <input
            type="number"
            step="0.01"
            defaultValue={totals.charity}
            onBlur={(e) => {
              const v = Number(e.target.value);
              if (!Number.isNaN(v)) setCharity(v);
            }}
            style={{ width: 140, padding: "10px 12px", borderRadius: 10, border: "1px solid #334155", background: "#0f172a", color: "white" }}
          />
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>(editable)</div>
        </div>

        <div style={{ marginTop: 14, borderTop: "1px solid #1f2937", paddingTop: 14 }}>
          {loading ? (
            <div style={{ fontSize: 12, color: "#cbd5e1" }}>Loading...</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", fontSize: 12, color: "#cbd5e1" }}>
                    <th style={{ padding: "8px 6px" }}>Player</th>
                    <th style={{ padding: "8px 6px" }}>Buy-in</th>
                    <th style={{ padding: "8px 6px" }}>Rebuys</th>
                    <th style={{ padding: "8px 6px" }}>Add-on</th>
                    <th style={{ padding: "8px 6px" }}>Total</th>
                    <th style={{ padding: "8px 6px" }} />
                  </tr>
                </thead>
                <tbody>
                  {inSessionOptions.map((p) => {
                    const v = byPlayer.get(p.player_id) ?? { buyin: 0, rebuy: 0, addon: 0 };
                    const rebuyCount = Math.min(2, Math.max(0, Math.round((v.rebuy || 0) / 5)));
                    const hasAddon = (v.addon || 0) > 0;
                    const total = (v.buyin || 0) + (v.rebuy || 0) + (v.addon || 0);

                    return (
                      <tr key={p.player_id} style={{ borderTop: "1px solid #1f2937" }}>
                        <td style={{ padding: "10px 6px", fontWeight: 900 }}>{p.player_registry?.full_name ?? "(no name)"}</td>
                        <td style={{ padding: "10px 6px" }}>${(v.buyin || 0).toFixed(2)}</td>
                        <td style={{ padding: "10px 6px" }}>
                          <select
                            value={String(rebuyCount)}
                            onChange={(e) => setRebuys(p.player_id, Number(e.target.value))}
                            disabled={!!busy}
                            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #334155", background: "#0f172a", color: "white" }}
                          >
                            <option value="0">0</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                          </select>
                          <span style={{ marginLeft: 10, fontSize: 12, color: "#cbd5e1" }}>(${(v.rebuy || 0).toFixed(2)})</span>
                        </td>
                        <td style={{ padding: "10px 6px" }}>
                          <button
                            onClick={() => setAddon(p.player_id, !hasAddon)}
                            disabled={!!busy}
                            style={{
                              padding: "8px 10px",
                              borderRadius: 10,
                              border: "1px solid #334155",
                              background: hasAddon ? "#16a34a" : "transparent",
                              color: "white",
                              fontWeight: 900,
                              cursor: "pointer",
                              opacity: busy ? 0.6 : 1,
                            }}
                          >
                            {hasAddon ? "Add-on ✓" : "Add add-on"}
                          </button>
                          <span style={{ marginLeft: 10, fontSize: 12, color: "#cbd5e1" }}>(${(v.addon || 0).toFixed(2)})</span>
                        </td>
                        <td style={{ padding: "10px 6px", fontWeight: 900 }}>${total.toFixed(2)}</td>
                        <td style={{ padding: "10px 6px" }}>
                          <button
                            onClick={() => removePlayer(p.player_id)}
                            disabled={!!busy}
                            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #7f1d1d", background: "transparent", color: "#fecaca", fontWeight: 900, cursor: "pointer", opacity: busy ? 0.6 : 1 }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* WINNERS */}
      <div style={{ marginTop: 18, border: "1px solid #1f2937", borderRadius: 14, padding: 14, background: "#0b1220", color: "white" }}>
        <div style={{ fontSize: 16, fontWeight: 900 }}>Winners</div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}># winners:</div>
          <select
            value={String(winnerCount)}
            onChange={(e) => setWinnerCount(Number(e.target.value))}
            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #334155", background: "#0f172a", color: "white" }}
          >
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>1st place</div>
            <select
              value={winner1}
              onChange={(e) => {
                setWinner1(e.target.value);
                setPlace(1, e.target.value);
              }}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #334155", background: "#0f172a", color: "white" }}
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
            <div style={{ fontSize: 12, marginBottom: 4 }}>2nd place</div>
            <select
              value={winner2}
              onChange={(e) => {
                setWinner2(e.target.value);
                setPlace(2, e.target.value);
              }}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #334155", background: "#0f172a", color: "white" }}
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
              <div style={{ fontSize: 12, marginBottom: 4 }}>3rd place</div>
              <select
                value={winner3}
                onChange={(e) => {
                  setWinner3(e.target.value);
                  setPlace(3, e.target.value);
                }}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #334155", background: "#0f172a", color: "white" }}
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
              <div style={{ fontSize: 12, marginBottom: 4 }}>4th place</div>
              <select
                value={winner4}
                onChange={(e) => {
                  setWinner4(e.target.value);
                  setPlace(4, e.target.value);
                }}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #334155", background: "#0f172a", color: "white" }}
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
      </div>

      <div style={{ marginTop: 18 }}>
        <AdminActivity groupKey="doostaneh" />
      </div>
    </div>
  );
}