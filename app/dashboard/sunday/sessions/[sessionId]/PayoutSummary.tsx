// app/dashboard/sunday/sessions/[sessionId]/PayoutSummary.tsx
import { createClient } from "@/lib/supabase/server";

type Props = {
  sessionId: string;
  status: string | null;
};

export default async function PayoutSummary({ sessionId, status }: Props) {
  if (status !== "computed") return null;

  const supabase = await createClient();

  const { data: sessionPlayers } = await supabase
    .from("session_registry_players")
    .select("player_id")
    .eq("session_id", sessionId);

  const playerIds = (sessionPlayers ?? []).map((r: any) => r.player_id).filter(Boolean);

  const { data: entries } = await supabase
    .from("player_entries")
    .select("registry_player_id, type, amount_usd")
    .eq("session_id", sessionId);

  const { data: ledgerRows } = await supabase
    .from("ledger_transactions")
    .select("registry_player_id, delta_usd, txn_type")
    .eq("session_id", sessionId);

  let playerRows: any[] = [];
  if (playerIds.length > 0) {
    const { data } = await supabase
      .from("player_registry")
      .select("id, full_name")
      .in("id", playerIds);

    playerRows = data ?? [];
  }

  const nameById = new Map<string, string>();
  playerRows.forEach((p: any) => {
    nameById.set(p.id, p.full_name ?? p.id.slice(0, 8));
  });

  const entryMap = new Map<string, { buyin: number; cashout: number }>();
  playerIds.forEach((id: string) => {
    entryMap.set(id, { buyin: 0, cashout: 0 });
  });

  (entries ?? []).forEach((e: any) => {
    const pid = e.registry_player_id;
    if (!pid) return;
    const row = entryMap.get(pid) ?? { buyin: 0, cashout: 0 };
    if (e.type === "buyin") row.buyin += Number(e.amount_usd || 0);
    if (e.type === "cashout") row.cashout += Number(e.amount_usd || 0);
    entryMap.set(pid, row);
  });

  const netMap = new Map<string, number>();
  (ledgerRows ?? []).forEach((r: any) => {
    const pid = r.registry_player_id;
    if (!pid) return;
    netMap.set(pid, Number(r.delta_usd || 0));
  });

  const rows = playerIds
    .map((id: string) => {
      const amounts = entryMap.get(id) ?? { buyin: 0, cashout: 0 };
      const net = netMap.get(id) ?? amounts.cashout - amounts.buyin;
      return {
        id,
        name: nameById.get(id) ?? id.slice(0, 8),
        buyin: amounts.buyin,
        cashout: amounts.cashout,
        net,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  if (rows.length === 0) return null;

  const totalBuyin = rows.reduce((s, r) => s + r.buyin, 0);
  const totalCashout = rows.reduce((s, r) => s + r.cashout, 0);
  const totalNet = rows.reduce((s, r) => s + r.net, 0);

  return (
    <div
      style={{
        marginTop: 18,
        border: "1px solid #E3E0D8",
        borderRadius: 20,
        padding: 20,
        background: "#FFFCF7",
        boxShadow: "0 10px 30px rgba(31, 42, 55, 0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 900, color: "#17342D" }}>
          Settlement Summary
        </div>

        <span
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 800,
            border: "1px solid #1d4ed8",
            background: "#0a1f44",
            color: "#bfdbfe",
          }}
        >
          Computed
        </span>
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
            {rows.map((row) => (
              <tr key={row.id}>
                <td
                  style={{
                    padding: 12,
                    borderBottom: "1px solid #F0EBE2",
                    fontWeight: 900,
                    color: "#17342D",
                  }}
                >
                  {row.name}
                </td>
                <td
                  style={{
                    padding: 12,
                    textAlign: "center",
                    borderBottom: "1px solid #F0EBE2",
                    color: "#17342D",
                  }}
                >
                  ${row.buyin.toFixed(2)}
                </td>
                <td
                  style={{
                    padding: 12,
                    textAlign: "center",
                    borderBottom: "1px solid #F0EBE2",
                    color: "#17342D",
                  }}
                >
                  ${row.cashout.toFixed(2)}
                </td>
                <td
                  style={{
                    padding: 12,
                    textAlign: "center",
                    borderBottom: "1px solid #F0EBE2",
                    fontWeight: 900,
                    color: row.net > 0 ? "#15803d" : row.net < 0 ? "#b91c1c" : "#111827",
                  }}
                >
                  {row.net > 0 ? "+" : ""}${row.net.toFixed(2)}
                </td>
              </tr>
            ))}

            <tr style={{ background: "#F8F3EA" }}>
              <td style={{ padding: 12, fontWeight: 900, color: "#17342D" }}>TOTAL</td>
              <td style={{ padding: 12, textAlign: "center", fontWeight: 900, color: "#17342D" }}>
                ${totalBuyin.toFixed(2)}
              </td>
              <td style={{ padding: 12, textAlign: "center", fontWeight: 900, color: "#17342D" }}>
                ${totalCashout.toFixed(2)}
              </td>
              <td
                style={{
                  padding: 12,
                  textAlign: "center",
                  fontWeight: 900,
                  color: totalNet === 0 ? "#15803d" : "#b91c1c",
                }}
              >
                {totalNet > 0 ? "+" : ""}${totalNet.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}