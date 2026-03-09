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
      {subtitle && (
        <div style={{ fontSize: 13, color: "#6A746F", marginTop: 6 }}>
          {subtitle}
        </div>
      )}
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

export default function DoostanehSessionPage() {
  const params = useParams();
  const sessionId = params?.sessionId as string;

  const [session, setSession] = useState<Session | null>(null);
  const [players, setPlayers] = useState<SRPRow[]>([]);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [registry, setRegistry] = useState<RegistryPlayer[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");

  const [winnerCount, setWinnerCount] = useState(3);
  const [winner1, setWinner1] = useState("");
  const [winner2, setWinner2] = useState("");
  const [winner3, setWinner3] = useState("");
  const [winner4, setWinner4] = useState("");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setErr(null);
    setLoading(true);

    const res = await fetch(`/api/doostaneh/sessions/${sessionId}/entry-state`, {
      cache: "no-store",
    });

    const j = await res.json();

    setSession(j.session);
    setPlayers(j.players || []);
    setEntries(j.entries || []);
    setLedger(j.ledger || []);

    const wc = Number(j.session?.doostaneh_winner_count ?? 3);
    setWinnerCount([2, 3, 4].includes(wc) ? wc : 3);

    const byPlace = new Map<number, string>();
    for (const p of j.players || []) {
      if (p.finish_place) byPlace.set(p.finish_place, p.player_id);
    }

    setWinner1(byPlace.get(1) ?? "");
    setWinner2(byPlace.get(2) ?? "");
    setWinner3(byPlace.get(3) ?? "");
    setWinner4(byPlace.get(4) ?? "");

    setLoading(false);
  }

  async function loadRegistry() {
    const res = await fetch(`/api/doostaneh/player-registry`, { cache: "no-store" });
    const j = await res.json();
    if (j?.ok) setRegistry(j.players || []);
  }

  useEffect(() => {
    if (!sessionId) return;
    refresh();
    loadRegistry();
  }, [sessionId]);

  const byPlayer = useMemo(() => {
    const m = new Map<string, { buyin: number; rebuy: number; addon: number }>();

    for (const p of players) m.set(p.player_id, { buyin: 0, rebuy: 0, addon: 0 });

    for (const e of entries) {
      const pid = e.registry_player_id;
      if (!pid) continue;
      const cur = m.get(pid) || { buyin: 0, rebuy: 0, addon: 0 };

      if (e.type === "buyin") cur.buyin += Number(e.amount_usd || 0);
      if (e.type === "rebuy") cur.rebuy += Number(e.amount_usd || 0);
      if (e.type === "addon") cur.addon += Number(e.amount_usd || 0);

      m.set(pid, cur);
    }

    return m;
  }, [players, entries]);

  const totals = useMemo(() => {
    let total = 0;

    for (const [, v] of byPlayer.entries()) {
      total += (v.buyin || 0) + (v.rebuy || 0) + (v.addon || 0);
    }

    const charity = session?.charity_usd ?? 10;
    const prizePool = total - charity;

    return { total, charity, prizePool };
  }, [byPlayer, session?.charity_usd]);

  async function post(path: string, body: any) {
    setBusy(path);

    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });

    const j = await res.json();

    if (!j?.ok) setErr(j?.error);

    await refresh();
    setBusy(null);
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

  async function setCharity(charity_usd: number) {
    await post(`/api/doostaneh/sessions/${sessionId}/set-charity`, {
      charity_usd,
    });
  }

  async function setPlace(place: number, playerId: string) {
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
    <div style={{ padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* ENTRY */}
        <SectionCard title="Tournament Entry">
          <div style={{ display: "flex", gap: 10 }}>
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
            >
              <option value="">Add player</option>
              {addable.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>

            <button onClick={addPlayer}>Add</button>
          </div>
        </SectionCard>

        {/* WINNERS */}
        <div style={{ marginTop: 18 }}>
          <SectionCard title="Winners">
            <div style={{ display: "grid", gap: 12 }}>

              <select value={winner1} onChange={(e) => {
                setWinner1(e.target.value)
                setPlace(1,e.target.value)
              }}>
                <option value="">1st</option>
                {inSessionOptions.map(p => (
                  <option key={p.player_id} value={p.player_id}>
                    {p.player_registry.full_name}
                  </option>
                ))}
              </select>

              <select value={winner2} onChange={(e)=>{
                setWinner2(e.target.value)
                setPlace(2,e.target.value)
              }}>
                <option value="">2nd</option>
                {inSessionOptions.map(p => (
                  <option key={p.player_id} value={p.player_id}>
                    {p.player_registry.full_name}
                  </option>
                ))}
              </select>

            </div>
          </SectionCard>
        </div>

        {/* RESULTS */}
        {ledger.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <SectionCard
              title="Tournament Results"
              subtitle="Final payouts and charity distribution"
            >
              <div style={{ marginBottom: 14 }}>
                <Badge label={`Prize Pool: $${totals.prizePool.toFixed(2)}`} tone="green" />
                <Badge label={`Charity: $${totals.charity.toFixed(2)}`} tone="gold" />
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {ledger
                  .filter((l) => l.txn_type === "payout")
                  .sort((a, b) => Number(b.delta_usd) - Number(a.delta_usd))
                  .map((l, i) => {
                    const player = players.find(
                      (p) => p.player_id === l.registry_player_id
                    );

                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "14px 16px",
                          border: "1px solid #E3E0D8",
                          borderRadius: 14,
                          background: "#F8F3EA",
                        }}
                      >
                        <div style={{ fontWeight: 900 }}>
                          {i + 1}. {player?.player_registry?.full_name}
                        </div>

                        <div style={{ fontWeight: 900, color: "#1F7A63" }}>
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
          <SectionCard title="Admin Activity">
            <AdminActivity groupKey="doostaneh" />
          </SectionCard>
        </div>

      </div>
    </div>
  );
}