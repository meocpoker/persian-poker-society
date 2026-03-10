// app/dashboard/sunday/sessions/[sessionId]/PayoutSummary.tsx
import { createClient } from "@/lib/supabase/server";

type Props = {
  sessionId: string;
  status: string | null;
};

function formatMoney(n: number): string {
  const sign = n > 0 ? "+" : "";
  const abs = Math.abs(n);
  return `${sign}$${abs.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function PayoutSummary({ sessionId, status }: Props) {
  if (status !== "computed") return null;

  const supabase = await createClient();

  const { data: ledgerRows } = await supabase
    .from("ledger_transactions")
    .select("user_id, registry_player_id, delta_usd")
    .eq("session_id", sessionId);

  if (!ledgerRows || ledgerRows.length === 0) return null;

  const payouts = ledgerRows
    .map((r: any) => ({
      id: r.registry_player_id ?? r.user_id,
      net: Number(r.delta_usd ?? 0),
    }))
    .sort((a: any, b: any) => b.net - a.net);

  const ids = payouts.map((p: any) => p.id).filter(Boolean);

  const { data: players } = await supabase
    .from("player_registry")
    .select("id, full_name")
    .in("id", ids);

  const nameById = new Map<string, string>();
  (players ?? []).forEach((p: any) => {
    nameById.set(p.id, p.full_name ?? p.id.slice(0, 8));
  });

  return (
    <div
      style={{
        marginTop: 24,
        border: "1px solid #E3E0D8",
        borderRadius: 20,
        padding: 20,
        background: "#FFFCF7",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 18, fontWeight: 900 }}>Settlement</h2>
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

      <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
        {payouts.map((p: any) => {
          const name = nameById.get(p.id) ?? p.id?.slice(0, 8);

          return (
            <div
              key={p.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid #E3E0D8",
                background: "#F8F3EA",
                fontWeight: 800,
              }}
            >
              <div>{name}</div>

              <div
                style={{
                  color:
                    p.net > 0 ? "#15803d" : p.net < 0 ? "#b91c1c" : "#334155",
                }}
              >
                {formatMoney(p.net)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}