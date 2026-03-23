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

  const { data: memberships, error: memErr } = await supabase
    .from("memberships")
    .select("group_key,status")
    .eq("user_id", user.id);

  if (memErr) redirect("/login");

  const approved = (memberships ?? [])
    .filter((m: any) => m.status === "approved")
    .map((m: any) => m.group_key);

  if (!approved.includes("doostaneh")) {
    if (approved.length === 1 && approved[0] === "sunday") redirect("/dashboard/sunday");
    if (approved.length >= 2) redirect("/choose");
    redirect("/login");
  }

  const { data: players, error: playersErr } = await supabase
    .from("player_registry")
    .select("id, full_name, email")
    .order("full_name", { ascending: true });

  const { data: spentRows, error: spentErr } = await supabase
    .from("ledger_transactions")
    .select("registry_player_id, delta_usd")
    .eq("group_key", "doostaneh")
    .eq("txn_type", "spent");

  const { data: payoutRows, error: payoutErr } = await supabase
    .from("ledger_transactions")
    .select("registry_player_id, delta_usd")
    .eq("group_key", "doostaneh")
    .eq("txn_type", "payout");

  if (playersErr || spentErr || payoutErr) {
    return (
      <PageShell
        eyebrow="Persian Men Society"
        title="Doostaneh Leaderboard"
        description="Historical totals for Doostaneh players."
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
        <SectionCard title="Error" subtitle="Could not load leaderboard">
          <div style={{ color: "#7f1d1d", fontWeight: 700 }}>
            {playersErr?.message || spentErr?.message || payoutErr?.message}
          </div>
        </SectionCard>
      </PageShell>
    );
  }

  const spentMap = new Map<string, number>();
  const payoutMap = new Map<string, number>();

  for (const row of spentRows ?? []) {
    const key = row.registry_player_id as string | null;
    if (!key) continue;
    const value = Number(row.delta_usd ?? 0);
    spentMap.set(key, (spentMap.get(key) ?? 0) + value);
  }

  for (const row of payoutRows ?? []) {
    const key = row.registry_player_id as string | null;
    if (!key) continue;
    const value = Number(row.delta_usd ?? 0);
    payoutMap.set(key, (payoutMap.get(key) ?? 0) + value);
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
      description="Historical totals for Doostaneh players."
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
      <SectionCard
        title="Player Totals"
        subtitle="Net = payout minus spent"
      >
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
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
              <thead>
                <tr style={{ background: "#F6F1E8", textAlign: "left" }}>
                  <th style={{ padding: 12, borderBottom: "1px solid #D9D3C7" }}>Rank</th>
                  <th style={{ padding: 12, borderBottom: "1px solid #D9D3C7" }}>Player</th>
                  <th style={{ padding: 12, borderBottom: "1px solid #D9D3C7" }}>Spent</th>
                  <th style={{ padding: 12, borderBottom: "1px solid #D9D3C7" }}>Payout</th>
                  <th style={{ padding: 12, borderBottom: "1px solid #D9D3C7" }}>Net</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, index) => (
                  <tr key={row.id}>
                    <td style={{ padding: 12, borderBottom: "1px solid #EEE7DA", fontWeight: 800 }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: 12, borderBottom: "1px solid #EEE7DA" }}>
                      <div style={{ fontWeight: 700, color: "#17342D" }}>{row.full_name}</div>
                      {row.email ? (
                        <div style={{ fontSize: 12, color: "#6E675D" }}>{row.email}</div>
                      ) : null}
                    </td>
                    <td style={{ padding: 12, borderBottom: "1px solid #EEE7DA" }}>
                      {money(row.spent)}
                    </td>
                    <td style={{ padding: 12, borderBottom: "1px solid #EEE7DA" }}>
                      {money(row.payout)}
                    </td>
                    <td
                      style={{
                        padding: 12,
                        borderBottom: "1px solid #EEE7DA",
                        fontWeight: 800,
                        color: row.net >= 0 ? "#166534" : "#991B1B",
                      }}
                    >
                      {money(row.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </PageShell>
  );
}