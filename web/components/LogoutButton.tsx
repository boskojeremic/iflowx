"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton({ className = "" }: { className?: string }) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={
        className ||
        "px-3 py-1 border border-white/20 rounded hover:bg-white/10 text-white/80"
      }
    >
      Logout
    </button>
  );
}