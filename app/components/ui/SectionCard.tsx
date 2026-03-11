"use client";

export default function SectionCard({
  title,
  subtitle,
  children,
  actions,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#FFFCF7",
        border: "1px solid #E3E0D8",
        borderRadius: 20,
        padding: 20,
        boxShadow: "0 10px 30px rgba(31, 42, 55, 0.05)",
      }}
    >
      {(title || actions) && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: subtitle ? 4 : 12,
          }}
        >
          {title && (
            <div style={{ fontSize: 18, fontWeight: 800, color: "#17342D" }}>
              {title}
            </div>
          )}

          {actions && <div>{actions}</div>}
        </div>
      )}

      {subtitle && (
        <div
          style={{
            fontSize: 13,
            color: "#5F6B66",
            marginBottom: 14,
          }}
        >
          {subtitle}
        </div>
      )}

      <div>{children}</div>
    </div>
  );
}