// src/app/login/page.tsx
'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError('Invalid email or password');
      setSubmitting(false);
      return;
    }

    const callbackUrl = params.get('callbackUrl') ?? '/trade';
    router.push(callbackUrl);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/60 p-6 shadow-[0_0_30px_rgba(0,0,0,0.7)] space-y-4"
      >
        <h1 className="text-xl font-semibold text-center text-[var(--neon)]">
          Log in to Coinvade
        </h1>

        {error && (
          <div className="rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-1 text-sm">
          <label className="block text-xs text-white/60">Email</label>
          <input
            type="email"
            className="w-full rounded-lg border border-white/20 bg-black/50 px-3 py-2 text-sm outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-1 text-sm">
          <label className="block text-xs text-white/60">Password</label>
          <input
            type="password"
            className="w-full rounded-lg border border-white/20 bg-black/50 px-3 py-2 text-sm outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          disabled={submitting}
          className="mt-2 w-full rounded-xl bg-cyan-500/90 py-2 text-sm font-semibold text-black shadow-[0_0_18px_rgba(34,211,238,0.6)] disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Log in'}
        </button>

        <p className="text-[11px] text-center text-white/50">
          Need an account?{' '}
          <a href="/register" className="text-cyan-300 hover:underline">
            Sign up
          </a>
        </p>
      </form>
    </main>
  );
}
