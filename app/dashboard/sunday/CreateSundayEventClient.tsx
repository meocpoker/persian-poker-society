"use client";

import { useState } from "react";

type HostOption = {
  user_id: string;
  name: string;
};

type HostInfo = {
  address: string | null;
  phone: string | null;
};

export default function CreateSundayEventClient({
  members,
  hostInfoMap,
}: {
  members: HostOption[];
  hostInfoMap: Record<string, HostInfo>;
}) {
  const [date, setDate] = useState("");
  const [hostId, setHostId] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function onHostChange(uid: string) {
    setHostId(uid);
    if (uid && hostInfoMap[uid]) {
      setAddress(hostInfoMap[uid].address ?? "");
      setPhone(hostInfoMap[uid].phone ?? "");
    } else {
      setAddress("");
      setPhone("");
    }
  }

  async function submit() {
    if (!date) {
      setError("Please select a date");
      return;
    }
    setBusy(true);
    setError(null);

    const res = await fetch("/api/sunday/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        host_user_id: hostId || null,
        host_address: address || null,
        host_phone: phone || null,
      }),
    });

    const json = await res.json();
    setBusy(false);

    if (!json.ok) {
      setError(json.error ?? "Failed to create event");
      return;
    }

    setSuccess(true);
    setTimeout(() => window.location.reload(), 600);
  }

  if (success) {
    return (
      <div style={{ color: "#1F7A63", fontWeight: 800, fontSize: 14 }}>
        Event created! Refreshing...
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#6A746F", marginBottom: 4 }}>Date</div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={busy}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #D9D3C7",
              background: "#F8F3EA",
              color: "#17342D",
              fontSize: 13,
              opacity: busy ? 0.7 : 1,
            }}
          />
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#6A746F", marginBottom: 4 }}>
            Host (optional)
          </div>
          <select
            value={hostId}
            onChange={(e) => onHostChange(e.target.value)}
            disabled={busy}
            style={{
              minWidth: 200,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #D9D3C7",
              background: "#F8F3EA",
              color: "#17342D",
              fontSize: 13,
              opacity: busy ? 0.7 : 1,
            }}
          >
            <option value="">No host</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#6A746F", marginBottom: 4 }}>
            Address (optional)
          </div>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St"
            disabled={busy}
            style={{
              width: 260,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #D9D3C7",
              background: "#F8F3EA",
              color: "#17342D",
              fontSize: 13,
              opacity: busy ? 0.7 : 1,
            }}
          />
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#6A746F", marginBottom: 4 }}>
            Phone (optional)
          </div>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            disabled={busy}
            style={{
              width: 180,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #D9D3C7",
              background: "#F8F3EA",
              color: "#17342D",
              fontSize: 13,
              opacity: busy ? 0.7 : 1,
            }}
          />
        </div>
      </div>

      {error && (
        <div style={{ color: "#8B1E2D", fontSize: 13, fontWeight: 700 }}>{error}</div>
      )}

      <div>
        <button
          type="button"
          onClick={submit}
          disabled={busy || !date}
          style={{
            padding: "10px 18px",
            borderRadius: 12,
            border: "none",
            background: busy || !date ? "#E3E0D8" : "#1F7A63",
            color: busy || !date ? "#6A746F" : "#FFFDF8",
            fontWeight: 900,
            fontSize: 13,
            cursor: busy || !date ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Creating..." : "Create Event & Start Session"}
        </button>
      </div>
    </div>
  );
}
