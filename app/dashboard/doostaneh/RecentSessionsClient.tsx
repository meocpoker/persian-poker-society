"use client";

import { useState } from "react";
import Link from "next/link";

type Session = {
  id: string;
  tournament_number: number | null;
  external_game_id: string | null;
  starts_at: string | null;
  status: string;
};

const DEFAULT_VISIBLE = 5;

function filterSessions(sessions: Session[], query: string): Session[] {
  const q = query.trim();
  if (!q) return sessions;

  const rangeMatch = q.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    const lo = parseInt(rangeMatch[1], 10);
    const hi = parseInt(rangeMatch[2], 10);
    return sessions.filter(
      (s) => s.tournament_number !== null && s.tournament_number >= lo && s.tournament_number <= hi
    );
  }

  const numMatch = q.match(/^\d+$/);
  if (numMatch) {
    const n = parseInt(q, 10);
    return sessions.filter((s) => s.tournament_number === n);
  }

  const lower = q.toLowerCase();
  return sessions.filter((s) => s.external_game_id?.toLowerCase().includes(lower));
}

export default function RecentSessionsClient({ sessions }: { sessions: Session[] }) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [confirmSessionId, setConfirmSessionId] = useState<string | null>(null);

  const validSessions = [...sessions]
    .filter((s) => s.tournament_number !== null || (s.external_game_id ?? "").trim() !== "")
    .sort((a, b) => {
      const aTime = a.starts_at ? new Date(a.starts_at).getTime() : 0;
      const bTime = b.starts_at ? new Date(b.starts_at).getTime() : 0;
      return bTime - aTime;
    });

  const filtered = filterSessions(validSessions, query);
  const visible = showAll ? filtered : filtered.slice(0, DEFAULT_VISIBLE);
  const hasMore = filtered.length > DEFAULT_VISIBLE;

  function handleSearch(value: string) {
    setQuery(value);
    setShowAll(false);
  }

  if (validSessions.length === 0) {
    return (
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
    );
  }

  return (
    <>
      {/* Warning modal for computed sessions */}
      {confirmSessionId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              background: "#FFFCF7",
              borderRadius: 20,
              padding: 28,
              maxWidth: 460,
              width: "100%",
              border: "1px solid #E3E0D8",
              boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 900, color: "#17342D", marginBottom: 12 }}>
              Edit Computed Game
            </div>
            <div style={{ fontSize: 14, color: "#4E5B55", lineHeight: 1.6, marginBottom: 24 }}>
              This game has already been computed. Any changes will require recomputing
              payouts and the previous results will be overwritten. Do you want to continue?
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmSessionId(null)}
                style={{
                  padding: "10px 18px",
                  borderRadius: 12,
                  border: "1px solid #D9D3C7",
                  background: "#FFFFFF",
                  color: "#17342D",
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  window.location.href = `/dashboard/doostaneh/sessions/${confirmSessionId}`;
                }}
                style={{
                  padding: "10px 18px",
                  borderRadius: 12,
                  border: "1px solid #1F7A63",
                  background: "#1F7A63",
                  color: "#FFFDF8",
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Continue to Edit
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search game # or range (e.g. 840-845)"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid #D9D3C7",
            background: "#F8F3EA",
            color: "#17342D",
            fontSize: 13,
            boxSizing: "border-box",
            marginBottom: 12,
          }}
        />

        {filtered.length === 0 ? (
          <div
            style={{
              border: "1px dashed #D9D3C7",
              borderRadius: 14,
              padding: 16,
              background: "#FBF7EF",
              fontSize: 14,
              color: "#6E675D",
            }}
          >
            No sessions match your search.
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gap: 10 }}>
              {visible.map((session) => (
                <div key={session.id} style={{ position: "relative" }}>
                  <Link
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
                      {session.starts_at
                        ? new Date(session.starts_at).toLocaleString()
                        : "No date"}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 13, fontWeight: 700 }}>
                      Status: {session.status}
                    </div>
                  </Link>

                  {session.status === "computed" && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setConfirmSessionId(session.id);
                      }}
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        padding: "6px 12px",
                        borderRadius: 10,
                        border: "1px solid #C89B3C",
                        background: "#FBF6EA",
                        color: "#7A5B17",
                        fontWeight: 800,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      Edit Game
                    </button>
                  )}
                </div>
              ))}
            </div>

            {hasMore && (
              <button
                type="button"
                onClick={() => setShowAll((prev) => !prev)}
                style={{
                  marginTop: 12,
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: "1px solid #D9D3C7",
                  background: "#FFFFFF",
                  color: "#17342D",
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {showAll ? "Show Less" : `Show All (${filtered.length})`}
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}
