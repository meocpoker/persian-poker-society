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
  return sessions.filter(
    (s) => s.external_game_id?.toLowerCase().includes(lower)
  );
}

export default function RecentSessionsClient({ sessions }: { sessions: Session[] }) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filtered = filterSessions(sessions, query);
  const visible = showAll ? filtered : filtered.slice(0, DEFAULT_VISIBLE);
  const hasMore = filtered.length > DEFAULT_VISIBLE;

  function handleSearch(value: string) {
    setQuery(value);
    setShowAll(false);
  }

  if (sessions.length === 0) {
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
  );
}
