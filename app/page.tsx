"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../lib/supabase/client";

type Group = { id: string; name: string; slug: string };

export default function HomePage() {
  const supabase = createClient();

  const [groups, setGroups] = useState<Group[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setErrorMsg(null);

      // ✅ TEMP DEBUG: prove whether a real Supabase session exists
      const {
        data: { user },
      } = await supabase.auth.getUser();

      console.log("USER:", user);

      if (!user) {
        setErrorMsg("NO SESSION");
        setGroups([]);
        return;
      }

      const { data, error } = await supabase
        .from("groups")
        .select("id,name,slug")
        .order("name", { ascending: true });

      if (error) {
        setErrorMsg(error.message);
        setGroups([]);
        return;
      }

      setGroups((data ?? []) as Group[]);
    }

    load();
  }, [supabase]);

  return (
    <main style={{ padding: 40 }}>
      <div className="card">
        <h1 className="h1">Choose your group</h1>
        <p className="h2">Click to register:</p>

        {errorMsg && <p style={{ color: "crimson" }}>Error: {errorMsg}</p>}

        <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/register/${g.slug}`}
              style={{
                display: "block",
                padding: "14px 16px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                fontSize: 24,
                cursor: "pointer",
              }}
            >
              {g.name}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
