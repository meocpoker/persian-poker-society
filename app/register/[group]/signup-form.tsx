"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";


export default function SignupForm({
  groupId,
  groupSlug,
}: {
  groupId: string;
  groupSlug: string;
}) {
  const supabase = createClient();

  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          group_id: groupId,
          group_slug: groupSlug,
        },
      },
    });

    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("Signed up!");
    router.push(`/g/${groupSlug}`);
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span>Full name</span>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          type="text"
          required
          style={{ padding: 10, fontSize: 16 }}
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>Email</span>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          style={{ padding: 10, fontSize: 16 }}
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>Password</span>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          minLength={6}
          style={{ padding: 10, fontSize: 16 }}
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="button buttonPrimary"
      >
        {loading ? "Creating account..." : "Continue"}
      </button>

      {msg && <p style={{ marginTop: 6 }}>{msg}</p>}
    </form>
  );
}

