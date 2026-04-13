"use client";

import { useState, useEffect } from "react";

type ResultRow = {
  name: string;
  buyin: number;
  cashout: number;
  net: number;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function PastResultsClient() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(y: number, m: number) {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/sunday/past-results?year=${y}&month=${m}`);
    const json = await res.json();
    setLoading(false);
    if (!json.ok) {
      setError(json.error ?? "Failed to load");
      return;
    }
    setRows(json.rows ?? []);
  }

  useEffect(() => {
    load(year, month);
  }, []);

  const years: number[] = [];
  for (let y = 2024; y <= now.getFullYear(); y++) years.push(y);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#6A746F", marginBottom: 4 }}>Month</div>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #D9D3C7",
              background: "#F8F3EA",
              color: "#17342D",
              fontSize: 13,
            }}
          >
            {MONTHS.map((label, i) => (
              <option key={i + 1} value={i + 1}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#6A746F", marginBottom: 4 }}>Year</div>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #D9D3C7",
              background: "#F8F3EA",
              color: "#17342D",
              fontSize: 13,
            }}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => load(year, month)}
          disabled={loading}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid #1F7A63",
            background: "#1F7A63",
            color: "#FFFDF8",
            fontWeight: 900,
            fontSize: 13,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Loading..." : "Load"}
        </button>
      </div>

      {error && (
        <div style={{ color: "#8B1E2D", fontSize: 13 }}>{error}</div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div style={{ fontSize: 13, color: "#6A746F" }}>
          No results for {MONTHS[month - 1]} {year}.
        </div>
      )}

      {rows.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #E3E0D8" }}>
                <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 800, color: "#6A746F" }}>
                  Player
                </th>
                <th style={{ textAlign: "right", padding: "6px 10px", fontWeight: 800, color: "#6A746F" }}>
                  Buy-in
                </th>
                <th style={{ textAlign: "right", padding: "6px 10px", fontWeight: 800, color: "#6A746F" }}>
                  Cash-out
                </th>
                <th style={{ textAlign: "right", padding: "6px 10px", fontWeight: 800, color: "#6A746F" }}>
                  Net
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #F0EDE6" }}>
                  <td style={{ padding: "8px 10px", fontWeight: 700, color: "#17342D" }}>{r.name}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", color: "#6A746F" }}>
                    ${r.buyin.toFixed(0)}
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "right", color: "#6A746F" }}>
                    ${r.cashout.toFixed(0)}
                  </td>
                  <td
                    style={{
                      padding: "8px 10px",
                      textAlign: "right",
                      fontWeight: 800,
                      color: r.net >= 0 ? "#1F7A63" : "#8B1E2D",
                    }}
                  >
                    {r.net >= 0 ? "+" : ""}${r.net.toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
