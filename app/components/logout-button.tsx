"use client";

import { createClient } from "../../lib/supabase/client";


export default function LogoutButton() {
  const supabase = createClient();
  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
      }}
      style={{ padding: "8px 12px", fontSize: 16, cursor: "pointer" }}
    >
      Logout
    </button>
  );
}
