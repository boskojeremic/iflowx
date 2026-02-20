"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";

export default function LoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });

    if (!res || res.error) {
      setLoading(false);
      setError("Invalid email or password");
      return;
    }

    // SUPER ADMIN → /admin
    // Običan user → /
    try {
      const r = await fetch("/api/admin/tenants", { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        if (d?.ok && Array.isArray(d?.tenants)) {
          // Super admin dobija "sve" (ok je i za običnog, ali mi ćemo kasnije napraviti čist /api/me)
          // Za sada: super admin redirect na /admin, ostali na /
          // Najsigurnije: ako user nema membership, tenants može biti [], pa NE zaključujemo super admin po tome.
          // Zato ovde samo probamo: ako endpoint vrati ok, ide na /admin.
          setLoading(false);
          window.location.assign("/admin");
          return;
        }
      }
    } catch {}

    setLoading(false);
    window.location.assign("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form
        onSubmit={onSubmit}
        className="border border-white/15 bg-black/30 rounded-xl p-6 w-[420px] space-y-4 backdrop-blur"
      >
        <h1 className="text-xl font-semibold text-white text-center">Login</h1>

        <input
          className="border border-white/15 bg-black/30 text-white w-full p-2 rounded focus:outline-none focus:ring-1 focus:ring-white/30"
          placeholder="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="relative">
          <input
            className="border border-white/15 bg-black/30 text-white w-full p-2 rounded pr-12 focus:outline-none focus:ring-1 focus:ring-white/30"
            placeholder="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error && <div className="text-red-400 text-sm text-center">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-md bg-black text-white font-medium hover:bg-black/80 disabled:opacity-50 transition"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}