"use client";

import { useEffect, useState } from "react";

type Player = {
  id: string;
  full_name: string | null;
  email: string | null;
  pokerstars_username: string | null;
};

type RowState = {
  username: string;
  busy: boolean;
  saved: boolean;
  error: string | null;
};

export default function PokerStarsMapClient() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/doostaneh/player-registry")
      .then((r) => r.json())
      .then((json) => {
        if (!json.ok) {
          setLoadError(json.error || "Failed to load players.");
          return;
        }
        const p: Player[] = json.players ?? [];
        setPlayers(p);
        const initial: Record<string, RowState> = {};
        for (const player of p) {
          initial[player.id] = {
            username: player.pokerstars_username ?? "",
            busy: false,
            saved: false,
            error: null,
          };
        }
        setRows(initial);
      })
      .catch(() => setLoadError("Failed to load players."))
      .finally(() => setLoading(false));
  }, []);

  async function save(playerId: string) {
    setRows((prev) => ({
      ...prev,
      [playerId]: { ...prev[playerId], busy: true, saved: false, error: null },
    }));

    const res = await fetch("/api/doostaneh/player-registry", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_id: playerId,
        pokerstars_username: rows[playerId]?.username ?? "",
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setRows((prev) => ({
        ...prev,
        [playerId]: { ...prev[playerId], busy: false, error: json?.error || "Save failed." },
      }));
      return;
    }

    setRows((prev) => ({
      ...prev,
      [playerId]: { ...prev[playerId], busy: false, saved: true },
    }));

    setTimeout(() => {
      setRows((prev) => ({
        ...prev,
        [playerId]: { ...prev[playerId], saved: false },
      }));
    }, 2000);
  }

  if (loading) {
    return <div style={{ fontSize: 14, color: "#6A746F" }}>Loading players…</div>;
  }

  if (loadError) {
    return <div style={{ fontSize: 14, color: "#8B1E2D" }}>{loadError}</div>;
  }

  if (players.length === 0) {
    return <div style={{ fontSize: 14, color: "#6A746F" }}>No players found.</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr>
            <th
              style={{
                padding: "8px 12px",
                border: "1px solid #E3E0D8",
                background: "#F8F3EA",
                textAlign: "left",
                fontWeight: 900,
                color: "#17342D",
              }}
            >
              Player
            </th>
            <th
              style={{
                padding: "8px 12px",
                border: "1px solid #E3E0D8",
                background: "#F8F3EA",
                textAlign: "left",
                fontWeight: 900,
                color: "#17342D",
              }}
            >
              PokerStars Username
            </th>
            <th
              style={{
                padding: "8px 12px",
                border: "1px solid #E3E0D8",
                background: "#F8F3EA",
                textAlign: "left",
                fontWeight: 900,
                color: "#17342D",
              }}
            >
              &nbsp;
            </th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => {
            const row = rows[player.id];
            if (!row) return null;
            return (
              <tr key={player.id}>
                <td
                  style={{
                    padding: "8px 12px",
                    border: "1px solid #E3E0D8",
                    fontWeight: 700,
                    color: "#17342D",
                    whiteSpace: "nowrap",
                  }}
                >
                  {player.full_name || player.email || player.id}
                </td>
                <td style={{ padding: "6px 12px", border: "1px solid #E3E0D8" }}>
                  <input
                    type="text"
                    value={row.username}
                    onChange={(e) =>
                      setRows((prev) => ({
                        ...prev,
                        [player.id]: { ...prev[player.id], username: e.target.value, saved: false },
                      }))
                    }
                    disabled={row.busy}
                    placeholder="e.g. StarPlayer99"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid #D9D3C7",
                      background: "#F8F3EA",
                      color: "#17342D",
                      fontSize: 13,
                      boxSizing: "border-box",
                      opacity: row.busy ? 0.7 : 1,
                    }}
                  />
                  {row.error && (
                    <div style={{ marginTop: 4, fontSize: 12, color: "#8B1E2D" }}>{row.error}</div>
                  )}
                </td>
                <td
                  style={{
                    padding: "6px 12px",
                    border: "1px solid #E3E0D8",
                    whiteSpace: "nowrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => save(player.id)}
                    disabled={row.busy}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: row.saved ? "1px solid #10b981" : "1px solid #1F7A63",
                      background: row.saved ? "#d1fae5" : "#1F7A63",
                      color: row.saved ? "#065f46" : "#FFFDF8",
                      fontWeight: 900,
                      fontSize: 13,
                      cursor: row.busy ? "not-allowed" : "pointer",
                      opacity: row.busy ? 0.7 : 1,
                    }}
                  >
                    {row.busy ? "Saving…" : row.saved ? "Saved!" : "Save"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
