"use client";

import React from "react";

export default function ConfirmSubmitButton({
  children,
  confirmText,
  style,
}: {
  children: React.ReactNode;
  confirmText: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="submit"
      style={style}
      onClick={(e) => {
        const ok = window.confirm(confirmText);
        if (!ok) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}