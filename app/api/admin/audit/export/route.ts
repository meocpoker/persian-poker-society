import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const group = searchParams.get("group");
  const action = searchParams.get("action");
  const session = searchParams.get("session");
  const range = searchParams.get("range");

  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!adminRow) return new NextResponse("Forbidden", { status: 403 });

  let q = supabase
    .from("admin_action_log")
    .select("created_at,group_key,action,session_id,status,message,actor_user_id")
    .order("created_at", { ascending: false });
if (range) {
  const now = new Date();
  let since: Date | null = null;

  if (range === "24h") since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (range === "7d") since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (range === "30d") since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  if (since) {
    q = q.gte("created_at", since.toISOString());
  }
}
  if (group) q = q.eq("group_key", group);
  if (action) q = q.eq("action", action);
  if (session) q = q.eq("session_id", session);

  const { data, error } = await q;
  if (error) return new NextResponse(error.message, { status: 500 });

  const rows = data ?? [];
  const header = [
    "created_at",
    "group_key",
    "action",
    "session_id",
    "status",
    "message",
    "actor_user_id",
  ];

  const csv = [
    header.join(","),
    ...rows.map((r: any) =>
      header
        .map((k) => {
          const v = (r?.[k] ?? "").toString().replace(/"/g, '""');
          return `"${v}"`;
        })
        .join(",")
    ),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=audit_log.csv",
    },
  });
}