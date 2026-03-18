"use client";

import { useState } from "react";

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
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);

  const styles: Record<
    Variant,
    { bg: string; hover: string; active: string; color: string }
  > = {
    green: {
      bg: "#1F7A63",
      hover: "#176651",
      active: "#0f4d3d",
      color: "white",
    },
    gold: {
      bg: "#C89B3C",
      hover: "#b38a2f",
      active: "#8a6a1f",
      color: "white",
    },
    red: {
      bg: "#8B1E2D",
      hover: "#6f1824",
      active: "#4f111a",
      color: "white",
    },
    gray: {
      bg: "#64748b",
      hover: "#4b5563",
      active: "#374151",
      color: "white",
    },
  };

  const s = styles[variant];

  const background = active
    ? s.active
    : hover
    ? s.hover
    : s.bg;

  const buttonStyle: React.CSSProperties = {
    background,
    color: s.color,
    border: "none",
    borderRadius: 12,
    padding: "10px 16px",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    transition: "all 0.15s ease",
    transform: active ? "scale(0.97)" : "scale(1)",
    boxShadow: hover
      ? "0 6px 16px rgba(0,0,0,0.12)"
      : "0 2px 6px rgba(0,0,0,0.08)",
  };

  const handlers = {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setActive(false);
    },
    onMouseDown: () => setActive(true),
    onMouseUp: () => setActive(false),
  };

  if (href) {
    return (
      <a href={href} style={{ textDecoration: "none" }}>
        <span style={buttonStyle} {...handlers}>
          {children}
        </span>
      </a>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      style={buttonStyle}
      {...handlers}
    >
      {children}
    </button>
  );
}