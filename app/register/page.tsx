"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type GroupKey = "doostaneh" | "sunday" | "friday";
type Choice = "doostaneh" | "sunday" | "friday" | "all_three";

export default function RegisterPage() {
  const supabase = useMemo(() => createClient(), []);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [choice, setChoice] = useState<Choice>("doostaneh");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      let userId: string | undefined;

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        // Email already registered — sign them in to get their existing userId
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          throw new Error(
            "This email is already registered. Please use your existing password, or log in at the login page."
          );
        }
        userId = signInData.user?.id;
      } else {
        userId = signUpData.user?.id;
      }

      if (!userId) {
        setSuccessMsg(
          "Signup successful. Please check your email to confirm your account, then log in to complete your request."
        );
        setLoading(false);
        return;
      }

      const groups: GroupKey[] =
        choice === "all_three"
          ? ["doostaneh", "sunday", "friday"]
          : [choice];

      const res = await fetch("/api/register/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          fullName,
          email,
          groups,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Failed to create membership request.");
      }

      setSuccessMsg(
        "Request submitted. Your membership is pending admin approval."
      );
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
          "radial-gradient(900px circle at 15% 15%, rgba(16,185,129,0.12), transparent 55%)," +
          "radial-gradient(800px circle at 85% 20%, rgba(5,150,105,0.10), transparent 55%)," +
          "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px",
      }}
    >
      <style>{`
        .card {
          width: 100%;
          max-width: 560px;
          background: rgba(255,255,255,0.94);
          border-radius: 20px;
          padding: 44px 42px;
          box-shadow: 0 22px 55px rgba(15,23,42,0.12);
          border: 1px solid rgba(15,23,42,0.08);
        }
        .titleRow { text-align: center; margin-bottom: 6px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .titleEn { font-size: 30px; font-weight: 850; color: #0f172a; letter-spacing: -0.02em; }
        .titleFa { font-size: 18px; font-weight: 650; color: #065f46; direction: rtl; white-space: nowrap; }
        .subtitleRow { text-align: center; margin-bottom: 26px; }
        .subtitleEn { font-size: 15px; color: #334155; }

        .label { display: block; margin-bottom: 8px; color: #0f172a; font-size: 13px; font-weight: 650; }
        .field {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          border: 1px solid rgba(148,163,184,0.85);
          outline: none;
          font-size: 14px;
          background: white;
          color: #0f172a;
        }
        .field::placeholder {
          color: #64748b;
          opacity: 1;
        }
        .field:focus {
          border-color: rgba(16,185,129,0.95);
          box-shadow: 0 0 0 4px rgba(16,185,129,0.18);
        }

        .optionBox {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          border-radius: 10px;
          border: 1px solid rgba(148,163,184,0.6);
          margin-bottom: 10px;
          cursor: pointer;
          user-select: none;
          color: #0f172a;
          background: #ffffff;
          font-size: 14px;
          font-weight: 600;
        }
        .optionBox:hover {
          border-color: #10b981;
          background: rgba(16,185,129,0.05);
        }
        .optionBox input[type="radio"] {
          accent-color: #0f766e;
        }

        .btn {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          color: white;
          font-weight: 750;
          font-size: 15px;
          background: linear-gradient(135deg, #064e3b 0%, #10b981 60%, #34d399 100%);
          box-shadow: 0 12px 22px rgba(16,185,129,0.22);
          margin-top: 18px;
        }
        .btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .note { margin-top: 12px; font-size: 13px; color: #64748b; text-align: center; }
        .error {
          margin-top: 14px; padding: 10px 12px; border-radius: 12px;
          background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.20);
          color: #991b1b; font-size: 13px; white-space: pre-wrap;
        }
        .success {
          margin-top: 14px; padding: 10px 12px; border-radius: 12px;
          background: rgba(16,185,129,0.10); border: 1px solid rgba(16,185,129,0.22);
          color: #065f46; font-size: 13px; white-space: pre-wrap;
        }
      `}</style>

      <div className="card">
        <div className="titleRow">
          <span className="titleEn">Persian Men Society Poker</span>
          <span className="titleFa">پاتوق پوکربازان ایرانی</span>
        </div>

        <div className="subtitleRow">
          <span className="subtitleEn">Request Membership</span>
        </div>

        <form onSubmit={onSubmit}>
          <label className="label">Full name</label>
          <input
            className="field"
            type="text"
            placeholder="e.g., Sanjar Azar"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <label className="label" style={{ marginTop: 14 }}>
            Email
          </label>
          <input
            className="field"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label className="label" style={{ marginTop: 14 }}>
            Password
          </label>
          <input
            className="field"
            type="password"
            placeholder="Create a password (min 6)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <label className="label" style={{ marginTop: 18 }}>
            Registering for
          </label>

          <label className="optionBox">
            <input
              type="radio"
              name="game"
              checked={choice === "doostaneh"}
              onChange={() => setChoice("doostaneh")}
            />
            <span>Doostaneh • دوستانه</span>
          </label>

          <label className="optionBox">
            <input
              type="radio"
              name="game"
              checked={choice === "sunday"}
              onChange={() => setChoice("sunday")}
            />
            <span>Sunday Poker • پوکر یکشنبه</span>
          </label>

          <label className="optionBox">
            <input
              type="radio"
              name="game"
              checked={choice === "friday"}
              onChange={() => setChoice("friday")}
            />
            <span>Friday • جمعه</span>
          </label>

          <label className="optionBox">
            <input
              type="radio"
              name="game"
              checked={choice === "all_three"}
              onChange={() => setChoice("all_three")}
            />
            <span>All Three • هر سه</span>
          </label>

          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Request Approval"}
          </button>
        </form>

        <div className="note">Requests appear in the admin approval panel.</div>

        {errorMsg && <div className="error">{errorMsg}</div>}
        {successMsg && <div className="success">{successMsg}</div>}
      </div>
    </div>
  );
}