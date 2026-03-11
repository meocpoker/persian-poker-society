"use client";

type Variant = "green" | "gold" | "red" | "gray";

export default function PrimaryButton({
  children,
  onClick,
  href,
  variant = "green",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: Variant;
  type?: "button" | "submit";
}) {
  const styles: Record<Variant, { bg: string; color: string }> = {
    green: {
      bg: "#1F7A63",
      color: "white",
    },
    gold: {
      bg: "#C89B3C",
      color: "white",
    },
    red: {
      bg: "#8B1E2D",
      color: "white",
    },
    gray: {
      bg: "#64748b",
      color: "white",
    },
  };

  const s = styles[variant];

  const buttonStyle: React.CSSProperties = {
    background: s.bg,
    color: s.color,
    border: "none",
    borderRadius: 12,
    padding: "10px 16px",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };

  if (href) {
    return (
      <a href={href} style={{ textDecoration: "none" }}>
        <span style={buttonStyle}>{children}</span>
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} style={buttonStyle}>
      {children}
    </button>
  );
}