"use client";

import { useMemo, useState } from "react";

type PlayerOption = {
  id: string;
  full_name: string | null;
};

type TableRow = {
  playerId: string;
  fullName: string;
  buyin: number;
  cashout: number;
};

export default function SundayAdminTableClient({
  sessionId,
  addablePlayers,
  initialRows,
  disabled,
}: {
  sessionId: string;
  addablePlayers: PlayerOption[];
  initialRows: TableRow[];
  disabled: boolean;
}) {
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [busy, setBusy] = useState(false);

  const totals = useMemo(() => {
    const totalBuyin = initialRows.reduce((s, r) => s + Number(r.buyin || 0), 0);
    const totalCashout = initialRows.reduce((s, r) => s + Number(r.cashout || 0), 0);
    const totalNet = totalCashout - totalBuyin;
    return { totalBuyin, totalCashout, totalNet };
  }, [initialRows]);

  async function addPlayer() {
    if (!selectedPlayerId) return;
    setBusy(true);

    await fetch(`/api/sunday/sessions/${sessionId}/add-player`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ player_id: selectedPlayerId }),
    });

    window.location.reload();
  }

  async function saveAmount(
    playerId: string,
    type: "buyin" | "cashout",
    rawValue: string
  ) {
    const amount = Number(rawValue || 0);
    setBusy(true);

    await fetch(
      `/api/sunday/sessions/${sessionId}/${type === "buyin" ? "set-buyin" : "set-cashout"}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          player_id: playerId,
          amount,
        }),
      }
    );

    window.location.reload();
  }

  return (
    <div
      style={{
        marginTop: 18,
        border: "1px solid #E3E0D8",
        borderRadius: 20,
        padding: 18,
        background: "#FFFCF7",
        boxShadow: "0 10px 30px rgba(31, 42, 55, 0.05)",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 900, color: "#17342D" }}>
        Sunday Player Entry
      </div>

      <div style={{ fontSize: 13, color: "#6A746F", marginTop: 6 }}>
        Add approved Sunday players, then enter one total buy-in and one total cash-out for each player.
      </div>

      <div
        style={{
          marginTop: 16,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <select
          value={selectedPlayerId}
          onChange={(e) => setSelectedPlayerId(e.target.value)}
          disabled={disabled || busy}
          style={{
            minWidth: 260,
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid #D9D3C7",
            background: "#F8F3EA",
            color: "#17342D",
            fontSize: 14,
            opacity: disabled || busy ? 0.7 : 1,
          }}
        >
          <option value="">Add approved Sunday player...</option>
          {addablePlayers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name ?? p.id}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={addPlayer}
          disabled={disabled || busy || !selectedPlayerId}
          style={{
            padding: "12px 16px",
            borderRadius: 14,
            border: "1px solid #1F7A63",
            background: "#1F7A63",
            color: "#FFFDF8",
            fontWeight: 900,
            cursor: "pointer",
            opacity: disabled || busy || !selectedPlayerId ? 0.6 : 1,
          }}
        >
          Add Player
        </button>
      </div>

      <div style={{ marginTop: 16, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F8F3EA" }}>
              <th
                style={{
                  padding: 12,
                  textAlign: "left",
                  borderBottom: "1px solid #E6E0D5",
                  fontSize: 12,
                  color: "#6A746F",
                }}
              >
                Player
              </th>
              <th
                style={{
                  padding: 12,
                  textAlign: "center",
                  borderBottom: "1px solid #E6E0D5",
                  fontSize: 12,
                  color: "#6A746F",
                }}
              >
                Buy-in
              </th>
              <th
                style={{
                  padding: 12,
                  textAlign: "center",
                  borderBottom: "1px solid #E6E0D5",
                  fontSize: 12,
                  color: "#6A746F",
                }}
              >
                Cash-out
              </th>
              <th
                style={{
                  padding: 12,
                  textAlign: "center",
                  borderBottom: "1px solid #E6E0D5",
                  fontSize: 12,
                  color: "#6A746F",
                }}
              >
                Net
              </th>
            </tr>
          </thead>
          <tbody>
            {initialRows.map((row) => (
              <tr key={row.playerId}>
                <td
                  style={{
                    padding: 12,
                    borderBottom: "1px solid #F0EBE2",
                    fontWeight: 900,
                    color: "#17342D",
                  }}
                >
                  {row.fullName}
                </td>

                <td
                  style={{
                    padding: 12,
                    textAlign: "center",
                    borderBottom: "1px solid #F0EBE2",
                  }}
                >
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={row.buyin}
                    disabled={disabled || busy}
                    onBlur={(e) => saveAmount(row.playerId, "buyin", e.currentTarget.value)}
                    style={{
                      width: 120,
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid #D9D3C7",
                      background: "#F8F3EA",
                      color: "#17342D",
                      textAlign: "center",
                      opacity: disabled || busy ? 0.7 : 1,
                    }}
                  />
                </td>

                <td
                  style={{
                    padding: 12,
                    textAlign: "center",
                    borderBottom: "1px solid #F0EBE2",
                  }}
                >
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={row.cashout}
                    disabled={disabled || busy}
                    onBlur={(e) => saveAmount(row.playerId, "cashout", e.currentTarget.value)}
                    style={{
                      width: 120,
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid #D9D3C7",
                      background: "#F8F3EA",
                      color: "#17342D",
                      textAlign: "center",
                      opacity: disabled || busy ? 0.7 : 1,
                    }}
                  />
                </td>

                <td
                  style={{
                    padding: 12,
                    textAlign: "center",
                    borderBottom: "1px solid #F0EBE2",
                    fontWeight: 900,
                    color:
                      row.cashout - row.buyin > 0
                        ? "#15803d"
                        : row.cashout - row.buyin < 0
                        ? "#b91c1c"
                        : "#111827",
                  }}
                >
                  {row.cashout - row.buyin > 0 ? "+" : ""}$
                  {(row.cashout - row.buyin).toFixed(2)}
                </td>
              </tr>
            ))}

            <tr style={{ background: "#F8F3EA" }}>
              <td style={{ padding: 12, fontWeight: 900, color: "#17342D" }}>TOTAL</td>
              <td style={{ padding: 12, textAlign: "center", fontWeight: 900, color: "#17342D" }}>
                ${totals.totalBuyin.toFixed(2)}
              </td>
              <td style={{ padding: 12, textAlign: "center", fontWeight: 900, color: "#17342D" }}>
                ${totals.totalCashout.toFixed(2)}
              </td>
              <td
                style={{
                  padding: 12,
                  textAlign: "center",
                  fontWeight: 900,
                  color: totals.totalNet === 0 ? "#15803d" : "#b91c1c",
                }}
              >
                {totals.totalNet > 0 ? "+" : ""}${totals.totalNet.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}