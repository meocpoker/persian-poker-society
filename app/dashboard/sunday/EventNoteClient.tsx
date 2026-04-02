"use client";

import { useState } from "react";

const MAX = 500;

export default function EventNoteClient({
  eventId,
  initialNote,
  isHost,
}: {
  eventId: string;
  initialNote: string | null;
  isHost: boolean;
}) {
  const [note, setNote] = useState(initialNote ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!isHost && !initialNote) return null;

  if (!isHost) {
    return (
      <div
        style={{
          marginTop: 12,
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid #E3E0D8",
          background: "#F8F3EA",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 800, color: "#6A746F", marginBottom: 4 }}>
          Host Note
        </div>
        <div style={{ fontSize: 14, color: "#17342D" }}>{initialNote}</div>
      </div>
    );
  }

  async function saveNote() {
    if (busy) return;
    setBusy(true);
    setSaved(false);

    const res = await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: note || null }),
    });

    setBusy(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(json?.error || "Failed to save note.");
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: "#6A746F", marginBottom: 6 }}>
        Host Note
      </div>
      <textarea
        value={note}
        onChange={(e) => {
          if (e.target.value.length <= MAX) {
            setNote(e.target.value);
            setSaved(false);
          }
        }}
        disabled={busy}
        rows={3}
        placeholder="Add a note for this event..."
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid #D9D3C7",
          background: "#F8F3EA",
          color: "#17342D",
          fontSize: 13,
          resize: "vertical",
          boxSizing: "border-box",
          opacity: busy ? 0.7 : 1,
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 6,
        }}
      >
        <span style={{ fontSize: 12, color: note.length >= MAX ? "#8B1E2D" : "#6A746F" }}>
          {note.length}/{MAX}
        </span>
        <button
          type="button"
          onClick={saveNote}
          disabled={busy}
          style={{
            padding: "8px 14px",
            borderRadius: 12,
            border: saved ? "1px solid #10b981" : "1px solid #1F7A63",
            background: saved ? "#d1fae5" : "#1F7A63",
            color: saved ? "#065f46" : "#FFFDF8",
            fontWeight: 900,
            fontSize: 13,
            cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? "Saving..." : saved ? "Saved!" : "Save Note"}
        </button>
      </div>
    </div>
  );
}
