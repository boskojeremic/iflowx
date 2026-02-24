"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function onLogout() {
    try {
      setLoading(true);

      // ⬇️ OVDE stavi TAČAN endpoint koji si koristio i ranije.
      // Najčešće je jedan od ovih:
      // await fetch("/api/auth/logout", { method: "POST" });
      // await fetch("/api/logout", { method: "POST" });
      // await fetch("/api/auth/signout", { method: "POST" });

      await fetch("/api/auth/logout", {
  method: "POST",
  credentials: "include",
});
window.location.href = "/login";
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={loading}
      className={className}
    >
      {children ?? (loading ? "Logging out…" : "Logout")}
    </button>
  );
}