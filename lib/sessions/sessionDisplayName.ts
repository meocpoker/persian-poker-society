// lib/sessions/sessionDisplayName.ts

export type SessionLike = {
  id?: string | null;
  group_key?: string | null;
  format?: string | null;
  starts_at?: string | null; // ISO string from Supabase
  status?: string | null;
  external_game_id?: string | null;
};

function formatStartsAt(starts_at?: string | null) {
  if (!starts_at) return "Unknown date";

  const d = new Date(starts_at);
  if (Number.isNaN(d.getTime())) return "Unknown date";

  // Example: 2026-02-27 11:57 PM
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  let h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;

  return `${yyyy}-${mm}-${dd} ${h}:${min} ${ampm}`;
}

export function sessionDisplayName(s: SessionLike) {
  const group = (s.group_key ?? "group").toString();
  const format = (s.format ?? "session").toString();
  const when = formatStartsAt(s.starts_at);

  const ext = (s.external_game_id ?? "").toString().trim();
  if (ext) return `${group} • ${format} • ${when} • ${ext}`;

  return `${group} • ${format} • ${when}`;
}