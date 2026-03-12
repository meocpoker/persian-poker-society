"use client";

import { useMemo, useState } from "react";

type EventItem = {
  id: string;
  title: string;
  event_date: string;
};

function monthLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function MonthCalendarClient({
  events,
}: {
  events: EventItem[];
}) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const grid = useMemo(() => {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);

    const startDay = start.getDay();
    const daysInMonth = end.getDate();

    const cells: Array<Date | null> = [];

    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    }
    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
  }, [cursor]);

  const today = new Date();

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
          }
          style={{
            padding: "8px 12px",
            borderRadius: 12,
            border: "1px solid #D9D3C7",
            background: "#F8F3EA",
            color: "#17342D",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          ← Prev
        </button>

        <div style={{ fontWeight: 900, color: "#17342D", fontSize: 18 }}>
          {monthLabel(cursor)}
        </div>

        <button
          type="button"
          onClick={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
          }
          style={{
            padding: "8px 12px",
            borderRadius: 12,
            border: "1px solid #D9D3C7",
            background: "#F8F3EA",
            color: "#17342D",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Next →
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 8,
        }}
      >
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontSize: 12,
              fontWeight: 800,
              color: "#6A746F",
              paddingBottom: 4,
            }}
          >
            {d}
          </div>
        ))}

        {grid.map((date, idx) => {
          const dayEvents = date
            ? events.filter((e) => sameDay(new Date(e.event_date), date))
            : [];

          const isToday = date ? sameDay(date, today) : false;
          const inMonth = !!date;

          return (
            <div
              key={idx}
              style={{
                minHeight: 88,
                border: "1px solid #E3E0D8",
                borderRadius: 14,
                background: inMonth ? "#FFFCF7" : "#F8F3EA",
                padding: 8,
                opacity: inMonth ? 1 : 0.45,
              }}
            >
              {date && (
                <>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 900,
                      color: isToday ? "#FFFDF8" : "#17342D",
                      background: isToday ? "#1F7A63" : "transparent",
                      marginBottom: 6,
                    }}
                  >
                    {date.getDate()}
                  </div>

                  <div style={{ display: "grid", gap: 4 }}>
                    {dayEvents.slice(0, 2).map((e) => (
                      <div
                        key={e.id}
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: "#1F7A63",
                          background: "#EDF7F4",
                          border: "1px solid #B9D7CF",
                          borderRadius: 10,
                          padding: "4px 6px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={e.title}
                      >
                        {e.title}
                      </div>
                    ))}

                    {dayEvents.length > 2 && (
                      <div style={{ fontSize: 11, color: "#6A746F", fontWeight: 700 }}>
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}