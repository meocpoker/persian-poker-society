"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ApprovedGroup = "doostaneh" | "sunday";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function routeByMembership() {
    const res = await fetch("/api/memberships", { method: "GET" });

    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      throw new Error(`Could not load membership (${res.status}). ${bodyText}`);
    }

    const json = await res.json();

    const approved: ApprovedGroup[] = (json.memberships || [])
      .filter((m: any) => m.status === "approved")
      .map((m: any) => m.group_key);

    if (approved.length === 0) {
      setErrorMsg(
        "Your account is not approved for any game yet. Please wait for admin approval."
      );
      return;
    }

    if (approved.length === 1) {
      router.push(
        approved[0] === "doostaneh"
          ? "/dashboard/doostaneh"
          : "/dashboard/sunday"
      );
      return;
    }

    router.push("/choose");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      await routeByMembership();
    } catch (err: any) {
      setErrorMsg(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(900px circle at 15% 15%, rgba(16,185,129,0.10), transparent 55%)," +
          "radial-gradient(800px circle at 85% 20%, rgba(5,150,105,0.08), transparent 55%)," +
          "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px",
      }}
    >
      <style>{`
        @keyframes floatIn { 0% { opacity: 0; transform: translateY(10px);} 100% { opacity: 1; transform: translateY(0);} }
        .card { width: 100%; max-width: 520px; background: rgba(255,255,255,0.94); border-radius: 20px; padding: 44px 42px;
          box-shadow: 0 22px 55px rgba(15,23,42,0.12); border: 1px solid rgba(15,23,42,0.08); animation: floatIn 420ms ease-out both; }
        .titleRow { text-align:center; margin-bottom: 6px; }
        .titleEn { font-size: 30px; font-weight: 850; color: #0f172a; letter-spacing: -0.02em; }
        .titleFa { font-size: 18px; font-weight: 650; color: #065f46; margin-left: 10px; direction: rtl; }
        .subtitleRow { text-align:center; margin-bottom: 24px; }
        .subtitleEn { font-size: 15px; color: #334155; }
        .label { display:block; margin-bottom:8px; color:#0f172a; font-size:13px; font-weight:650; }
        .field { width:100%; padding:12px; border-radius:10px; border:1px solid rgba(148,163,184,0.85); outline:none; font-size:14px; background:white;
          transition:border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease; }
        .field:focus { border-color: rgba(16,185,129,0.95); box-shadow:0 0 0 4px rgba(16,185,129,0.18); transform: translateY(-1px); }
        .btn { width:100%; padding:12px; border-radius:10px; border:none; cursor:pointer; color:white; font-weight:750; font-size:15px;
          background: linear-gradient(135deg, #064e3b 0%, #10b981 60%, #34d399 100%);
          box-shadow: 0 12px 22px rgba(16,185,129,0.22);
          transition: transform 150ms ease, box-shadow 150ms ease, filter 150ms ease; margin-top:18px; }
        .btn:hover { transform: translateY(-1px); box-shadow:0 16px 28px rgba(16,185,129,0.28); filter:saturate(1.05); }
        .btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .row { display:flex; justify-content:space-between; align-items:center; margin-top:12px; gap:10px; color:#64748b; font-size:13px; }
        .link { color:#065f46; text-decoration:none; font-weight:650; }
        .link:hover { text-decoration:underline; }
        .hint { text-align:center; margin-top:14px; color:#64748b; font-size:13px; }
        .error { margin-top: 14px; padding: 10px 12px; border-radius: 10px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.20); color: #991b1b; font-size: 13px; white-space: pre-wrap; }
      `}</style>

      <div className="card">
        <div className="titleRow">
          <span className="titleEn">Persian Men Society Poker</span>
          <span className="titleFa">پوکر انجمن مردان پارسی</span>
        </div>

        <div className="subtitleRow">
          <span className="subtitleEn">Member Login</span>
        </div>

        <form onSubmit={onSubmit}>
          <label className="label">Email</label>
          <input
            className="field"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="label" style={{ marginTop: "14px" }}>
            Password
          </label>
          <input
            className="field"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="row">
          <span>New here?</span>
          <a className="link" href="/register">
            Request Approval
          </a>
        </div>

        <p className="hint">After you sign in, we’ll route you to your approved dashboard.</p>

        {errorMsg && <div className="error">{errorMsg}</div>}
      </div>
    </div>
  );
}
