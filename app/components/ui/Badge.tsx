"use client";

type BadgeVariant = "green" | "red" | "gold" | "gray";

export default function Badge({
  children,
  variant = "green",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
}) {
  const styles: Record<BadgeVariant, { bg: string; color: string }> = {
    green: {
      bg: "rgba(16,185,129,0.12)",
      color: "#065f46",
    },
    red: {
      bg: "rgba(239,68,68,0.12)",
      color: "#7f1d1d",
    },
    gold: {
      bg: "rgba(200,155,60,0.15)",
      color: "#7c5a00",
    },
    gray: {
      bg: "rgba(100,116,139,0.12)",
      color: "#334155",
    },
  };

  const s = styles[variant];

  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 800,
        padding: "4px 10px",
        borderRadius: 999,
        background: s.bg,
        color: s.color,
        display: "inline-block",
      }}
    >
      {children}
    </span>
  );
}