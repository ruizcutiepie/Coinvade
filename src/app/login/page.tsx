// src/app/login/page.tsx
'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // ✅ IMPORTANT: include callbackUrl and use returned res.url
    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
      callbackUrl: '/trade',
    });

    setSubmitting(false);

    // ✅ Helps us see the truth in the browser console
    console.log('signIn response:', res);

    if (!res) {
      setError('No response from sign in. Open Network tab and check /api/auth/callback/credentials.');
      return;
    }

    if (res.error) {
      setError('Invalid email or password.');
      return;
    }

    // ✅ Use replace + refresh so middleware/app-router sees the new session right away
    router.replace(res.url ?? '/trade');
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 p-6 shadow-[0_0_40px_rgba(0,0,0,.7)]">
        <h1 className="mb-2 text-center text-2xl font-semibold tracking-wide text-[var(--neon)]">
          COINVADE LOGIN
        </h1>
        <p className="mb-6 text-center text-sm text-white/60">
          Sign in to access your trading dashboard.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-white/60">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-black/70 px-3 py-2 text-sm outline-none focus:border-cyan-400/70"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/60">Password</label>

            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/70 px-3 py-2 pr-16 text-sm outline-none focus:border-cyan-400/70"
                placeholder="••••••••"
                autoComplete="current-password"
              />

              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-white/80 hover:border-white/30 hover:bg-white/10"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? 'HIDE' : 'VIEW'}
              </button>
            </div>

            <div className="mt-1 text-[11px] text-white/40">
              Tip: Click <span className="text-white/70">VIEW</span> to reveal your password.
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-xl bg-cyan-500 py-2.5 text-sm font-semibold text-black shadow-[0_0_24px_rgba(34,211,238,.7)] transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-white/60">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="font-semibold text-cyan-400 hover:text-cyan-300 underline underline-offset-4"
          >
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}