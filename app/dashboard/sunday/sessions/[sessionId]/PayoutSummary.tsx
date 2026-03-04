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
    .select("user_id, delta_usd")
    .eq("session_id", sessionId);

  if (!ledgerRows || ledgerRows.length === 0) return null;

  const userIds = Array.from(new Set(ledgerRows.map((r: any) => r.user_id)));

  const nameById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    (profiles ?? []).forEach((p: any) => {
      nameById.set(p.id, p.full_name ?? p.email ?? p.id.slice(0, 8));
    });
  }

  const payouts = ledgerRows
    .map((r: any) => {
      const net = Number(r.delta_usd ?? 0);
      const name = nameById.get(r.user_id) ?? r.user_id.slice(0, 8);
      return { userId: r.user_id, name, net };
    })
    .sort((a: any, b: any) => b.net - a.net);

  return (
    <div className="mt-6 rounded-lg border bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Payout Summary</h2>
        <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
          Computed
        </span>
      </div>

      {/* Desktop/tablet */}
      <div className="hidden overflow-hidden rounded-md border sm:block">
        <div className="grid grid-cols-2 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">
          <div>Player</div>
          <div className="text-right">Net</div>
        </div>

        <div className="divide-y">
          {payouts.map((p) => (
            <div key={p.userId} className="grid grid-cols-2 px-3 py-2 text-sm">
              <div className="truncate">{p.name}</div>
              <div
                className={`text-right font-semibold ${
                  p.net > 0
                    ? "text-green-600"
                    : p.net < 0
                    ? "text-red-600"
                    : "text-gray-700"
                }`}
              >
                {formatMoney(p.net)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile/cards */}
      <div className="grid gap-2 sm:hidden">
        {payouts.map((p) => (
          <div
            key={p.userId}
            className="flex items-center justify-between gap-3 rounded-md border px-3 py-3"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{p.name}</div>
              <div className="mt-0.5 text-xs text-gray-500">
                Net result
              </div>
            </div>

            <div
              className={`shrink-0 text-sm font-extrabold ${
                p.net > 0
                  ? "text-green-600"
                  : p.net < 0
                  ? "text-red-600"
                  : "text-gray-700"
              }`}
            >
              {formatMoney(p.net)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}