'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    setSubmitting(false);

    if (res?.error) {
      setError('Invalid email or password.');
      return;
    }

    // ✅ Successful login – send user to /trade (or wherever you want)
    router.push('/trade');
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
            <label className="mb-1 block text-xs text-white/60">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-black/70 px-3 py-2 text-sm outline-none focus:border-cyan-400/70"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/60">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-black/70 px-3 py-2 text-sm outline-none focus:border-cyan-400/70"
              placeholder="••••••••"
            />
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

        {/* 👇 New: Register link */}
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
