import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Persian Men Society",
  description: "Poker Management System",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  let pendingCount = 0;
  let isAdmin = false;

  if (user) {
    // check admin
    const { data: adminRow } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    isAdmin = !!adminRow;

    if (isAdmin) {
      // 🔥 FIX: force count to return
      const { count } = await supabase
        .from("memberships")
        .select("id", { count: "exact" })
        .eq("status", "pending");

      pendingCount = count || 0;
    }
  }

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Top Nav */}
        <div
          style={{
            width: "100%",
            borderBottom: "1px solid #E5E7EB",
            background: "#FFFFFF",
            padding: "10px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Link
            href="/dashboard"
            style={{
              fontWeight: 900,
              fontSize: 16,
              color: "#111827",
              textDecoration: "none",
            }}
          >
            Persian Men Society
          </Link>

          {user && (
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <Link
                href="/dashboard"
                style={{ color: "#111827", fontWeight: 700 }}
              >
                Dashboard
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  style={{
                    position: "relative",
                    color: "#111827",
                    fontWeight: 700,
                  }}
                >
                  Admin
                  {pendingCount > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: -6,
                        right: -10,
                        background: "#DC2626",
                        color: "white",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 800,
                        padding: "2px 6px",
                      }}
                    >
                      {pendingCount}
                    </span>
                  )}
                </Link>
              )}

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
  <span style={{ fontSize: 13, color: "#111827" }}>
    {user.email}
  </span>

  <form action="/auth/logout" method="post">
    <button
      style={{
        padding: "6px 10px",
        borderRadius: 8,
        border: "1px solid #E5E7EB",
        background: "#F9FAFB",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      Logout
    </button>
  </form>
</div>
            </div>
          )}
        </div>

        {children}
      </body>
    </html>
  );
}