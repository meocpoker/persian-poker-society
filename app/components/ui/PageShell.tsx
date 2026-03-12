"use client";

export default function PageShell({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FAF6EF 0%, #F7F1E7 100%)",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <div
          style={{
            background: "#FFFCF7",
            border: "1px solid #E3E0D8",
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 16px 40px rgba(31, 42, 55, 0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              {eyebrow ? (
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                    color: "#C89B3C",
                  }}
                >
                  {eyebrow}
                </div>
              ) : null}

              <div
                style={{
                  fontSize: 34,
                  lineHeight: 1.1,
                  fontWeight: 900,
                  color: "#17342D",
                  marginTop: 8,
                }}
              >
                {title}
              </div>

              {description ? (
                <div
                  style={{
                    fontSize: 15,
                    color: "#5F6B66",
                    marginTop: 10,
                    maxWidth: 760,
                  }}
                >
                  {description}
                </div>
              ) : null}
            </div>

            {actions ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {actions}
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ marginTop: 20 }}>{children}</div>
      </div>
    </div>
  );
}