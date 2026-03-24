import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/app/components/ui/PageShell";
import SectionCard from "@/app/components/ui/SectionCard";
import { createClient } from "@/lib/supabase/server";

export default async function DoostanehLeaderboardPage() {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("memberships")
    .select("group_key,status")
    .eq("user_id", user.id);

  const approved = (memberships ?? [])
    .filter((m: any) => m.status === "approved")
    .map((m: any) => m.group_key);

  if (!approved.includes("doostaneh")) {
    if (approved.length === 1 && approved[0] === "sunday") redirect("/dashboard/sunday");
    if (approved.length >= 2) redirect("/choose");
    redirect("/login");
  }

  const { data: players } = await supabase
    .from("player_registry")
    .select("id, full_name, email")
    .order("full_name", { ascending: true });

  const { data: spentRows } = await supabase
    .from("ledger_transactions")
    .select("registry_player_id, delta_usd")
    .eq("group_key", "doostaneh")
    .eq("txn_type", "spent");

  const { data: payoutRows } = await supabase
    .from("ledger_transactions")
    .select("registry_player_id, delta_usd")
    .eq("group_key", "doostaneh")
    .eq("txn_type", "payout");

  const spentMap = new Map<string, number>();
  const payoutMap = new Map<string, number>();

  for (const row of spentRows ?? []) {
    const key = row.registry_player_id as string | null;
    if (!key) continue;
    spentMap.set(key, (spentMap.get(key) ?? 0) + Number(row.delta_usd ?? 0));
  }

  for (const row of payoutRows ?? []) {
    const key = row.registry_player_id as string | null;
    if (!key) continue;
    payoutMap.set(key, (payoutMap.get(key) ?? 0) + Number(row.delta_usd ?? 0));
  }

  const leaderboard = (players ?? [])
    .map((player: any) => {
      const spent = Math.abs(spentMap.get(player.id) ?? 0);
      const payout = payoutMap.get(player.id) ?? 0;
      const net = payout - spent;

      return {
        id: player.id,
        full_name: player.full_name,
        email: player.email,
        spent,
        payout,
        net,
      };
    })
    .filter((row) => row.spent !== 0 || row.payout !== 0)
    .sort((a, b) => b.net - a.net);

  const money = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);

  return (
    <PageShell
      eyebrow="Persian Men Society"
      title="Doostaneh Leaderboard"
      description="Historical totals ranked by performance"
      actions={
        <Link
          href="/dashboard/doostaneh"
          style={{
            color: "#1F7A63",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          ← Back to Doostaneh
        </Link>
      }
    >
      <SectionCard title="Leaderboard" subtitle="Sorted by net winnings">
        {leaderboard.length === 0 ? (
          <div
            style={{
              border: "1px dashed #D9D3C7",
              borderRadius: 14,
              padding: 16,
              background: "#FBF7EF",
            }}
          >
            No leaderboard data found.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F6F1E8", textAlign: "left" }}>
                  <th style={{ padding: 12 }}>Rank</th>
                  <th style={{ padding: 12 }}>Player</th>
                  <th style={{ padding: 12 }}>Spent</th>
                  <th style={{ padding: 12 }}>Payout</th>
                  <th style={{ padding: 12 }}>Net</th>
                </tr>
              </thead>

              <tbody>
                {leaderboard.map((row, index) => {
                  const bg =
                    index === 0
                      ? "#FFF7D6"
                      : index === 1
                      ? "#F3F4F6"
                      : index === 2
                      ? "#FDE2E2"
                      : "transparent";

                  return (
                    <tr key={row.id} style={{ background: bg }}>
                      <td style={{ padding: 12, fontWeight: 900 }}>
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                      </td>

                      <td style={{ padding: 12 }}>
                        <div style={{ fontWeight: 900 }}>{row.full_name}</div>
                        {row.email && (
                          <div style={{ fontSize: 12, color: "#6E675D" }}>
                            {row.email}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: 12 }}>{money(row.spent)}</td>
                      <td style={{ padding: 12, color: "#1F7A63", fontWeight: 700 }}>
                        {money(row.payout)}
                      </td>

                      <td
                        style={{
                          padding: 12,
                          fontWeight: 900,
                          color: row.net >= 0 ? "#166534" : "#991B1B",
                        }}
                      >
                        {row.net > 0 ? "+" : ""}
                        {money(row.net)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </PageShell>
  );
}