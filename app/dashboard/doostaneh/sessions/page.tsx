import Link from "next/link";
import PageShell from "@/app/components/ui/PageShell";
import SectionCard from "@/app/components/ui/SectionCard";
import { createClient } from "@/lib/supabase/server";

export default async function DoostanehSessionsPage() {
  const supabase = await createClient();

  const { data: sessions, error: sessionsErr } = await supabase
    .from("sessions")
    .select("id, tournament_number, external_game_id, starts_at, status")
    .eq("group_key", "doostaneh")
    .order("tournament_number", { ascending: false })
    .limit(200);

  return (
    <PageShell
      eyebrow="Persian Men Society"
      title="Doostaneh Sessions"
      description="Historical and active Doostaneh sessions."
      actions={
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
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
        </div>
      }
    >
      <SectionCard
        title="Session List"
        subtitle="Click any session to open it from the Doostaneh dashboard."
      >
        {sessionsErr ? (
          <div style={{ color: "#7f1d1d", fontWeight: 700 }}>
            {sessionsErr.message}
          </div>
        ) : sessions && sessions.length > 0 ? (
          <div style={{ display: "grid", gap: 10 }}>
            {sessions.map((session: any) => (
              <Link
                key={session.id}
                href={`/dashboard/doostaneh?session=${session.id}`}
                style={{
                  display: "block",
                  border: "1px solid #D9D3C7",
                  borderRadius: 12,
                  padding: 14,
                  textDecoration: "none",
                  background: "#FFFDF8",
                  color: "#17342D",
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 16 }}>
                  Game {session.tournament_number ?? "—"}
                </div>
                <div style={{ marginTop: 4, fontSize: 13, color: "#6E675D" }}>
                  {session.external_game_id ?? "No external game id"}
                </div>
                <div style={{ marginTop: 4, fontSize: 13, color: "#6E675D" }}>
                  {session.starts_at ? new Date(session.starts_at).toLocaleString() : "No date"}
                </div>
                <div style={{ marginTop: 4, fontSize: 13, fontWeight: 700 }}>
                  Status: {session.status}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div
            style={{
              border: "1px dashed #D9D3C7",
              borderRadius: 14,
              padding: 16,
              background: "#FBF7EF",
            }}
          >
            No sessions found.
          </div>
        )}
      </SectionCard>
    </PageShell>
  );
}