"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const r = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: true,
        callbackUrl: "/",  // ✅ uvek vodi na dashboard (app/page.tsx)
      });
      

    setLoading(false);

    if (!r || r.error) {
      setError("Invalid email or password");
      return;
    }

    // ✅ success → dashboard je na "/"
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form
        onSubmit={onSubmit}
        className="border border-white/15 bg-black/30 rounded-xl p-6 w-[420px] space-y-3"
      >
        <h1 className="text-xl font-semibold text-white">Login</h1>

        <input
          className="border border-white/15 bg-black/30 text-white w-full p-2 rounded"
          placeholder="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="border border-white/15 bg-black/30 text-white w-full p-2 rounded"
          placeholder="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <div className="text-red-400 text-sm">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-md bg-black text-white font-medium hover:bg-black/80 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
