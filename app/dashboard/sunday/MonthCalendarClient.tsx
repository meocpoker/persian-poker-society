"use client";

import { useMemo, useState } from "react";

type Event = {
  id: string;
  title: string;
  event_date: string;
};

export default function MonthCalendarClient({ events }: { events: Event[] }) {
  const today = new Date();

  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const daysInMonth = lastDay.getDate();
  const startWeekday = firstDay.getDay();

  const eventsByDay = useMemo(() => {
    const map: Record<number, Event[]> = {};

    for (const e of events) {
      const d = new Date(e.event_date);

      // Group by UTC day/month/year so +00:00 timestamps don't shift into a different local day
      if (d.getUTCMonth() === month && d.getUTCFullYear() === year) {
        const day = d.getUTCDate();
        if (!map[day]) map[day] = [];
        map[day].push(e);
      }
    }

    return map;
  }, [events, month, year]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ marginTop: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 20, fontWeight: 900 }}>
          {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid rgba(15,23,42,0.15)",
              background: "white",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            ‹
          </button>

          <button
            type="button"
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid rgba(15,23,42,0.15)",
              background: "white",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Today
          </button>

          <button
            type="button"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid rgba(15,23,42,0.15)",
              background: "white",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            ›
          </button>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {/* Weekday headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            style={{
              fontWeight: 800,
              fontSize: 12,
              textAlign: "center",
              paddingBottom: 4,
            }}
          >
            {d}
          </div>
        ))}

        {/* Day cells */}
        {cells.map((day, idx) => (
          <div
            key={idx}
            style={{
              minHeight: 90,
              border: "1px solid rgba(15,23,42,0.1)",
              borderRadius: 8,
              padding: 6,
              background:
                day !== null &&
                day === today.getDate() &&
                month === today.getMonth() &&
                year === today.getFullYear()
                  ? "rgba(16,185,129,0.08)"
                  : "white",
            }}
          >
            {day !== null && (
              <>
                <div style={{ fontSize: 12, fontWeight: 800 }}>{day}</div>

               {eventsByDay[day]?.map((e) => (
  <div
    key={e.id}
    onClick={() => {
  // Ask the toggle to open, and pass the eventId so it can scroll after opening
  window.dispatchEvent(
    new CustomEvent("pms:open-event-list", { detail: { eventId: e.id } })
  );
}}
    style={{
      marginTop: 4,
      fontSize: 11,
      padding: "2px 4px",
      borderRadius: 6,
      background: "rgba(59,130,246,0.12)",
      cursor: "pointer",
    }}
  >
    {e.title}
  </div>
))}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}