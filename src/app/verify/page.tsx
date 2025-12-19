// src/app/verify/page.tsx
'use client';

import React from 'react';
import AppShell from '../components/AppShell';

export default function VerifyPage() {
  return (
    <AppShell title="Verify">
      <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-black/40 p-6 shadow-[0_0_40px_rgba(0,0,0,.6)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Verify Account</h1>
        </div>

        <p className="mb-5 text-sm text-white/70">
          This is the verification center (KYC). Complete verification to unlock full features.
        </p>

        <div className="space-y-3 text-sm">
          <div className="rounded-xl border border-white/10 bg-black/60 p-4">
            <div className="mb-1 font-medium">Step 1: Personal Information</div>
            <div className="text-xs text-white/60">Name, birthday, address</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/60 p-4">
            <div className="mb-1 font-medium">Step 2: Upload ID</div>
            <div className="text-xs text-white/60">Government ID (front/back)</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/60 p-4">
            <div className="mb-1 font-medium">Step 3: Selfie Verification</div>
            <div className="text-xs text-white/60">Selfie + liveness check</div>
          </div>

          <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-xs text-amber-100">
            Note: This page is now visible and accessible. Next: add real form + uploads.
          </div>
        </div>

        <button
          type="button"
          className="mt-6 w-full rounded-xl bg-cyan-500/90 py-3 text-sm font-semibold text-black shadow-[0_0_20px_rgba(34,211,238,.6)] hover:bg-cyan-400"
          onClick={() => alert('Verification flow coming next (form + upload).')}
        >
          Start Verification
        </button>
      </div>
    </AppShell>
  );
}
