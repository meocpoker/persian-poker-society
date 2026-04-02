import Link from "next/link";

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(900px circle at 15% 15%, rgba(16,185,129,0.12), transparent 55%)," +
          "radial-gradient(800px circle at 85% 20%, rgba(5,150,105,0.10), transparent 55%)," +
          "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "rgba(255,255,255,0.94)",
          borderRadius: 20,
          padding: "52px 44px",
          boxShadow: "0 22px 55px rgba(15,23,42,0.12)",
          border: "1px solid rgba(15,23,42,0.08)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: 1.1,
            textTransform: "uppercase",
            color: "#065f46",
            marginBottom: 10,
          }}
        >
          Persian Men Society
        </div>

        <div
          style={{
            fontSize: 32,
            fontWeight: 900,
            color: "#0f172a",
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
          }}
        >
          Persian Poker
        </div>

        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#065f46",
            direction: "rtl",
            marginTop: 6,
            marginBottom: 32,
          }}
        >
          پاتوق پوکربازان ایرانی
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Link
            href="/login"
            style={{
              display: "block",
              padding: "13px 0",
              borderRadius: 12,
              background:
                "linear-gradient(135deg, #064e3b 0%, #10b981 60%, #34d399 100%)",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: 15,
              textDecoration: "none",
              boxShadow: "0 10px 22px rgba(16,185,129,0.22)",
            }}
          >
            Log In
          </Link>

          <Link
            href="/register"
            style={{
              display: "block",
              padding: "13px 0",
              borderRadius: 12,
              background: "#ffffff",
              color: "#065f46",
              fontWeight: 800,
              fontSize: 15,
              textDecoration: "none",
              border: "1.5px solid #10b981",
            }}
          >
            Sign Up
          </Link>
        </div>

        <div style={{ marginTop: 24, fontSize: 13, color: "#64748b" }}>
          Request membership to join a poker group.
        </div>
      </div>
    </div>
  );
}
