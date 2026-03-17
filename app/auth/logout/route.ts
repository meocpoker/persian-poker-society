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