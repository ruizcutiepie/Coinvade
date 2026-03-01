// src/app/verify/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';

type KycStatus = 'NOT_STARTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

type Tab = 'kyc' | 'id_upload' | 'email';

function safeLsGet(key: string) {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLsSet(key: string, value: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function pill(status: KycStatus) {
  if (status === 'VERIFIED') return 'text-emerald-200';
  if (status === 'PENDING') return 'text-amber-200';
  if (status === 'REJECTED') return 'text-rose-200';
  return 'text-white/80';
}

export default function VerifyPage() {
  const [tab, setTab] = useState<Tab>('kyc');

  // -------------------- KYC FORM (existing behavior, but with uploads + email tab added) --------------------
  const [status, setStatus] = useState<KycStatus>('NOT_STARTED');

  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('');
  const [docType, setDocType] = useState('Passport');
  const [docNumber, setDocNumber] = useState('');
  const [note, setNote] = useState('');

  // -------------------- ID UPLOAD --------------------
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  // -------------------- EMAIL VERIFY --------------------
  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);

  useEffect(() => {
    const s = safeLsGet('coinvade.kyc.status') as KycStatus | null;
    if (s) setStatus(s);

    const ev = safeLsGet('coinvade.email.verified');
    if (ev === 'true') setEmailVerified(true);

    const savedEmail = safeLsGet('coinvade.email.value');
    if (savedEmail) setEmail(savedEmail);
  }, []);

  function persistStatus(next: KycStatus) {
    setStatus(next);
    safeLsSet('coinvade.kyc.status', next);
  }

  async function submitKyc() {
    // Demo flow: store locally + optionally hit API (non-blocking)
    persistStatus('PENDING');

    try {
      await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          country,
          docType,
          docNumber,
          note: note || null,
        }),
      }).catch(() => null);
    } catch {
      // ignore (demo)
    }

    alert('Verification submitted. Status set to Pending (demo).');
  }

  function resetKyc() {
    setFullName('');
    setCountry('');
    setDocType('Passport');
    setDocNumber('');
    setNote('');
    persistStatus('NOT_STARTED');
    alert('Status reset (demo).');
  }

  const canSubmitKyc = useMemo(() => {
    return (
      fullName.trim().length > 1 &&
      country.trim().length > 1 &&
      docType.trim().length > 0 &&
      docNumber.trim().length > 3
    );
  }, [fullName, country, docType, docNumber]);

  async function submitUploads() {
    if (!idFront || !selfie) {
      alert('Please upload at least ID Front and a Selfie.');
      return;
    }

    setUploadBusy(true);
    try {
      // Demo upload: send FormData to an API route (optional). If you don’t have it yet, this still won’t break the page.
      const fd = new FormData();
      fd.append('idFront', idFront);
      if (idBack) fd.append('idBack', idBack);
      fd.append('selfie', selfie);

      const res = await fetch('/api/kyc/upload', { method: 'POST', body: fd }).catch(() => null);

      if (res && !res.ok) {
        // even if it fails, we keep demo UX
        console.warn('[verify] upload route returned non-OK');
      }

      alert('Files submitted (demo). Your admin can review them.');
    } finally {
      setUploadBusy(false);
    }
  }

  async function sendEmailCode() {
    const v = email.trim();
    if (!v || !v.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }

    setEmailBusy(true);
    try {
      safeLsSet('coinvade.email.value', v);

      // Demo call (optional)
      await fetch('/api/verify-email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: v }),
      }).catch(() => null);

      alert('Verification code sent (demo). Check your email.');
    } finally {
      setEmailBusy(false);
    }
  }

  async function confirmEmailCode() {
    if (!emailCode.trim()) {
      alert('Please enter the code.');
      return;
    }

    setEmailBusy(true);
    try {
      // Demo: accept any code (or you can require 6 digits)
      await fetch('/api/verify-email/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: emailCode.trim() }),
      }).catch(() => null);

      setEmailVerified(true);
      safeLsSet('coinvade.email.verified', 'true');
      alert('Email verified (demo).');
    } finally {
      setEmailBusy(false);
    }
  }

  function resetEmail() {
    setEmailVerified(false);
    setEmailCode('');
    safeLsSet('coinvade.email.verified', 'false');
    alert('Email verification reset (demo).');
  }

  return (
    <AppShell title="Verification">
      <section className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-black/40 p-6 shadow-[0_0_40px_rgba(0,0,0,.6)]">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold">Verification</h1>
          <p className="mt-1 text-xs text-white/60">Submit your KYC details to unlock full features.</p>
        </div>

        {/* Tabs */}
        <div className="mb-5 flex flex-wrap gap-2 text-xs">
          {([
            { key: 'kyc', label: 'KYC Form' },
            { key: 'id_upload', label: 'Upload ID Photos' },
            { key: 'email', label: 'Verify Email' },
          ] as { key: Tab; label: string }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-4 py-1.5 ${
                tab === t.key
                  ? 'bg-cyan-500 text-black shadow-[0_0_18px_rgba(34,211,238,.6)]'
                  : 'border border-white/15 bg-black/40 text-white/70 hover:border-white/40'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Status */}
        <div className="mb-6 rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm">
          <span className="text-white/70">Status:</span>{' '}
          <span className={`font-semibold ${pill(status)}`}>
            {status === 'NOT_STARTED'
              ? 'Not started'
              : status === 'PENDING'
              ? 'Pending review'
              : status === 'VERIFIED'
              ? 'Verified'
              : 'Rejected'}
          </span>
          {emailVerified && (
            <span className="ml-3 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[11px] text-emerald-200">
              Email verified
            </span>
          )}
        </div>

        {/* KYC FORM TAB */}
        {tab === 'kyc' && (
          <div className="space-y-4 text-sm">
            <div>
              <label className="mb-1 block text-xs text-white/60">Full name *</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm outline-none"
                placeholder="Your legal name"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
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
                  onChange={(e) => setDocType(e.target.value)}
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
                className="h-28 w-full resize-none rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm outline-none"
                placeholder="Extra details for the reviewer…"
              />
            </div>

            <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-[11px] text-amber-100">
              Tip: Upload your ID photos in the <b>Upload ID Photos</b> tab so the admin can review faster.
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={submitKyc}
                disabled={!canSubmitKyc}
                className="rounded-xl bg-cyan-500/90 px-5 py-3 text-sm font-semibold text-black shadow-[0_0_20px_rgba(34,211,238,.6)] transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Submit verification
              </button>
              <button
                onClick={resetKyc}
                className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm text-white/80 hover:border-white/40"
              >
                Reset status
              </button>
            </div>
          </div>
        )}

        {/* ID UPLOAD TAB */}
        {tab === 'id_upload' && (
          <div className="space-y-4 text-sm">
            <p className="text-xs text-white/60">
              Upload clear photos. Minimum required: <b>ID Front</b> + <b>Selfie</b>.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <div className="mb-2 text-xs font-semibold text-white/80">ID Front *</div>
                <label className="block cursor-pointer rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-[11px] text-white/80 hover:border-white/40">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setIdFront(e.target.files?.[0] ?? null)}
                  />
                  Choose file
                </label>
                <div className="mt-2 text-[11px] text-white/50">
                  {idFront ? `Selected: ${idFront.name}` : 'No file selected.'}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <div className="mb-2 text-xs font-semibold text-white/80">ID Back (optional)</div>
                <label className="block cursor-pointer rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-[11px] text-white/80 hover:border-white/40">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setIdBack(e.target.files?.[0] ?? null)}
                  />
                  Choose file
                </label>
                <div className="mt-2 text-[11px] text-white/50">
                  {idBack ? `Selected: ${idBack.name}` : 'No file selected.'}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/40 p-4 md:col-span-2">
                <div className="mb-2 text-xs font-semibold text-white/80">Selfie *</div>
                <label className="block cursor-pointer rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-[11px] text-white/80 hover:border-white/40">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setSelfie(e.target.files?.[0] ?? null)}
                  />
                  Choose file
                </label>
                <div className="mt-2 text-[11px] text-white/50">
                  {selfie ? `Selected: ${selfie.name}` : 'No file selected.'}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-[11px] text-amber-100">
              Demo flow: files are submitted to an API route if present. If not, the UI still works without breaking.
            </div>

            <button
              onClick={submitUploads}
              disabled={uploadBusy}
              className="w-full rounded-xl bg-cyan-500/90 py-3 text-sm font-semibold text-black shadow-[0_0_20px_rgba(34,211,238,.6)] transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploadBusy ? 'Submitting…' : 'Submit ID photos'}
            </button>
          </div>
        )}

        {/* EMAIL TAB */}
        {tab === 'email' && (
          <div className="space-y-4 text-sm">
            <p className="text-xs text-white/60">
              Verify your email so you can receive alerts and confirmations.
            </p>

            <div>
              <label className="mb-1 block text-xs text-white/60">Email address</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm outline-none"
                placeholder="you@example.com"
              />
            </div>

            <button
              onClick={sendEmailCode}
              disabled={emailBusy || !email.trim()}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-white/90 hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {emailBusy ? 'Sending…' : 'Send verification code'}
            </button>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-white/60">Code</label>
                <input
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm outline-none"
                  placeholder="Enter code"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={confirmEmailCode}
                  disabled={emailBusy || !emailCode.trim()}
                  className="flex-1 rounded-xl bg-emerald-500/90 py-3 text-sm font-semibold text-black shadow-[0_0_18px_rgba(16,185,129,.5)] hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {emailBusy ? 'Verifying…' : 'Verify'}
                </button>
                <button
                  onClick={resetEmail}
                  className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white/80 hover:border-white/40"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/50 p-3 text-[11px] text-white/70">
              Status:{' '}
              <span className={emailVerified ? 'text-emerald-200' : 'text-white/70'}>
                {emailVerified ? 'Verified' : 'Not verified'}
              </span>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}