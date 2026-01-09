// src/app/verify/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';

type VerifyStatus = 'not_started' | 'submitted' | 'approved' | 'rejected';

export default function VerifyPage() {
  const [status, setStatus] = useState<VerifyStatus>('not_started');
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('');
  const [docType, setDocType] = useState<'Passport' | 'National ID' | 'Driver License'>('Passport');
  const [docNumber, setDocNumber] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    const s = (typeof window !== 'undefined' && window.localStorage.getItem('coinvade.verifyStatus')) || null;
    if (s === 'submitted' || s === 'approved' || s === 'rejected') setStatus(s);
  }, []);

  function persist(next: VerifyStatus) {
    setStatus(next);
    if (typeof window !== 'undefined') window.localStorage.setItem('coinvade.verifyStatus', next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !country.trim() || !docNumber.trim()) {
      alert('Please complete all required fields.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          country: country.trim(),
          docType,
          docNumber: docNumber.trim(),
          note: note.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        alert(data?.error || 'Unable to submit verification. Please try again.');
        return;
      }

      persist('submitted');
      alert('Verification submitted. Our team will review your details.');
    } catch {
      alert('Network error submitting verification.');
    } finally {
      setLoading(false);
    }
  }

  const badge =
    status === 'not_started'
      ? 'border-white/15 bg-black/40 text-white/80'
      : status === 'submitted'
        ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100'
        : status === 'approved'
          ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
          : 'border-rose-400/30 bg-rose-400/10 text-rose-100';

  return (
    <AppShell title="Verify">
      <section className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-black/40 p-6 shadow-[0_0_40px_rgba(0,0,0,.6)]">
        <h1 className="text-2xl font-semibold">Verification</h1>
        <p className="mt-2 text-sm text-white/60">Submit your KYC details to unlock full features.</p>

        <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${badge}`}>
          <span className="text-white/60">Status:</span>{' '}
          <span className="font-semibold">
            {status === 'not_started'
              ? 'Not started'
              : status === 'submitted'
                ? 'Submitted'
                : status === 'approved'
                  ? 'Approved'
                  : 'Rejected'}
          </span>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs text-white/60">Full name *</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm outline-none"
              placeholder="Your legal name"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-white/60">Country *</label>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm outline-none"
                placeholder="Country of residence"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-white/60">Document type *</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as any)}
                className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm outline-none"
              >
                <option>Passport</option>
                <option>National ID</option>
                <option>Driver License</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/60">Document number *</label>
            <input
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm outline-none"
              placeholder="ID / Passport number"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/60">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-24 w-full resize-none rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm outline-none"
              placeholder="Extra details for the reviewer…"
            />
          </div>

          <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-xs text-amber-100">
            Demo flow: this stores status locally + hits an API route so you can extend it to DB/admin review later.
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-cyan-500/90 px-5 py-3 text-sm font-semibold text-black shadow-[0_0_20px_rgba(34,211,238,.6)] hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Submitting…' : 'Submit verification'}
            </button>

            <button
              type="button"
              onClick={() => persist('not_started')}
              className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm text-white/80 hover:border-white/40"
            >
              Reset status
            </button>
          </div>
        </form>
      </section>
    </AppShell>
  );
}
