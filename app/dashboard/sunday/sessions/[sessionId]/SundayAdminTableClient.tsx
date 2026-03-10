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
        marginTop: 24,
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: 16,
        background: "white",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>
        Sunday Player Entry
      </div>

      <div
        style={{
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
            minWidth: 240,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
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
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #334155",
            background: "#0b1220",
            color: "white",
            fontWeight: 800,
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
            <tr style={{ background: "#f8fafc" }}>
              <th
                style={{
                  padding: 10,
                  textAlign: "left",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                Player
              </th>
              <th
                style={{
                  padding: 10,
                  textAlign: "center",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                Buy-in
              </th>
              <th
                style={{
                  padding: 10,
                  textAlign: "center",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                Cash-out
              </th>
              <th
                style={{
                  padding: 10,
                  textAlign: "center",
                  borderBottom: "1px solid #e5e7eb",
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
                    padding: 10,
                    borderBottom: "1px solid #e5e7eb",
                    fontWeight: 700,
                  }}
                >
                  {row.fullName}
                </td>

                <td
                  style={{
                    padding: 10,
                    textAlign: "center",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={row.buyin}
                    disabled={disabled || busy}
                    onBlur={(e) => saveAmount(row.playerId, "buyin", e.currentTarget.value)}
                    style={{
                      width: 110,
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid #cbd5e1",
                      textAlign: "center",
                      opacity: disabled || busy ? 0.7 : 1,
                    }}
                  />
                </td>

                <td
                  style={{
                    padding: 10,
                    textAlign: "center",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={row.cashout}
                    disabled={disabled || busy}
                    onBlur={(e) => saveAmount(row.playerId, "cashout", e.currentTarget.value)}
                    style={{
                      width: 110,
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid #cbd5e1",
                      textAlign: "center",
                      opacity: disabled || busy ? 0.7 : 1,
                    }}
                  />
                </td>

                <td
                  style={{
                    padding: 10,
                    textAlign: "center",
                    borderBottom: "1px solid #e5e7eb",
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

            <tr style={{ background: "#f8fafc" }}>
              <td style={{ padding: 10, fontWeight: 900 }}>TOTAL</td>
              <td style={{ padding: 10, textAlign: "center", fontWeight: 900 }}>
                ${totals.totalBuyin.toFixed(2)}
              </td>
              <td style={{ padding: 10, textAlign: "center", fontWeight: 900 }}>
                ${totals.totalCashout.toFixed(2)}
              </td>
              <td
                style={{
                  padding: 10,
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