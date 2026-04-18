"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type GroupKey = "sunday" | "friday";

type TableRow = {
  playerId: string;
  fullName: string;
  buyin: number;
  cashout: number;
};

export default function SundayAdminTableClient({
  sessionId,
  initialRows,
  disabled,
  groupKey = "sunday",
  initialCheckedIds,
}: {
  sessionId: string;
  initialRows: TableRow[];
  disabled: boolean;
  groupKey?: GroupKey;
  initialCheckedIds?: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [includedIds, setIncludedIds] = useState<Set<string>>(
    () => initialCheckedIds ? new Set(initialCheckedIds) : new Set(initialRows.map((r) => r.playerId))
  );

  const isFriday = groupKey === "friday";
  const groupLabel = isFriday ? "Friday" : "Sunday";
  const apiBase = isFriday ? "/api/friday" : "/api/sunday";

  const totals = useMemo(() => {
    const included = initialRows.filter((r) => includedIds.has(r.playerId));
    const totalBuyin = included.reduce((s, r) => s + Number(r.buyin || 0), 0);
    const totalCashout = included.reduce((s, r) => s + Number(r.cashout || 0), 0);
    const totalNet = totalCashout - totalBuyin;
    return { totalBuyin, totalCashout, totalNet };
  }, [initialRows, includedIds]);

  function toggleIncluded(playerId: string) {
    setIncludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }

  async function saveAmount(
    playerId: string,
    type: "buyin" | "cashout",
    rawValue: string
  ) {
    const amount = Number(rawValue || 0);
    setBusy(true);
    try {
      const res = await fetch(
        `${apiBase}/sessions/${sessionId}/${type === "buyin" ? "set-buyin" : "set-cashout"}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ player_id: playerId, amount }),
        }
      );
      const text = await res.text();
      if (!res.ok) {
        alert(text || `${type} failed (${res.status})`);
        return;
      }
      router.refresh();
    } catch (error: any) {
      alert(error?.message || `${type} failed`);
    } finally {
      setBusy(false);
    }
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
        {groupLabel} Player Entry
      </div>
      <div style={{ fontSize: 13, color: "#6A746F", marginTop: 6 }}>
        Uncheck a player to exclude them. Enter one total buy-in and cash-out per player.
      </div>

      <div style={{ marginTop: 16, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F8F3EA" }}>
              <th
                style={{
                  padding: 12,
                  textAlign: "center",
                  borderBottom: "1px solid #E6E0D5",
                  fontSize: 12,
                  color: "#6A746F",
                  width: 40,
                }}
              >
                In
              </th>
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
            {initialRows.map((row) => {
              const included = includedIds.has(row.playerId);
              const rowDisabled = disabled || busy || !included;
              return (
                <tr key={row.playerId} style={{ opacity: included ? 1 : 0.4 }}>
                  <td
                    style={{
                      padding: 12,
                      textAlign: "center",
                      borderBottom: "1px solid #F0EBE2",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={included}
                      disabled={disabled}
                      onChange={() => toggleIncluded(row.playerId)}
                      style={{
                        width: 16,
                        height: 16,
                        cursor: disabled ? "not-allowed" : "pointer",
                      }}
                    />
                  </td>
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
                      disabled={rowDisabled}
                      onBlur={(e) =>
                        saveAmount(row.playerId, "buyin", e.currentTarget.value)
                      }
                      style={{
                        width: 120,
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid #D9D3C7",
                        background: "#F8F3EA",
                        color: "#17342D",
                        textAlign: "center",
                        opacity: rowDisabled ? 0.7 : 1,
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
                      disabled={rowDisabled}
                      onBlur={(e) =>
                        saveAmount(row.playerId, "cashout", e.currentTarget.value)
                      }
                      style={{
                        width: 120,
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid #D9D3C7",
                        background: "#F8F3EA",
                        color: "#17342D",
                        textAlign: "center",
                        opacity: rowDisabled ? 0.7 : 1,
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
              );
            })}

            <tr style={{ background: "#F8F3EA" }}>
              <td />
              <td style={{ padding: 12, fontWeight: 900, color: "#17342D" }}>
                TOTAL
              </td>
              <td
                style={{
                  padding: 12,
                  textAlign: "center",
                  fontWeight: 900,
                  color: "#17342D",
                }}
              >
                ${totals.totalBuyin.toFixed(2)}
              </td>
              <td
                style={{
                  padding: 12,
                  textAlign: "center",
                  fontWeight: 900,
                  color: "#17342D",
                }}
              >
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
