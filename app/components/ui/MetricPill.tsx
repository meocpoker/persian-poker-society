"use client";

export default function MetricPill({
  label,
  value,
  color = "green",
}: {
  label: string;
  value: number | string;
  color?: "green" | "red" | "gray";
}) {
  const colors = {
    green: {
      bg: "rgba(16,185,129,0.12)",
      text: "#065f46",
    },
    red: {
      bg: "rgba(239,68,68,0.12)",
      text: "#7f1d1d",
    },
    gray: {
      bg: "rgba(100,116,139,0.12)",
      text: "#334155",
    },
  };

  const c = colors[color];

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        background: c.bg,
        color: c.text,
        fontSize: 13,
        fontWeight: 800,
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}