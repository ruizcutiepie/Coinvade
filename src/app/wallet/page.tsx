// src/app/wallet/page.tsx
'use client';

// Prevent static generation and caching
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
// You can keep revalidate = 0 for clarity, it's safe:
export const revalidate = 0;

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type DepositAmount = 25 | 50 | 100;

function WalletContent() {
  const [balance] = useState<number>(1000);
  const search = useSearchParams();
  const depositStatus = search.get('deposit'); // "success" | "cancel" | null

  const Banner = useMemo(() => {
    if (depositStatus === 'success') {
      return (
        <div className="mb-4 rounded-xl border border-teal-700/40 bg-teal-900/25 p-3 text-teal-200">
          Deposit completed (provider reported success).
        </div>
      );
    }
    if (depositStatus === 'cancel') {
      return (
        <div className="mb-4 rounded-xl border border-amber-700/40 bg-amber-900/25 p-3 text-amber-200">
          Deposit cancelled.
        </div>
      );
    }
    return null;
  }, [depositStatus]);

  async function handleDeposit(amount: DepositAmount) {
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          userId: 'demo-user',
          successPath: '/wallet?deposit=success',
          cancelPath: '/wallet?deposit=cancel',
        }),
      });

      const data = await res.json();
      if (data?.hostedUrl) {
        window.location.href = data.hostedUrl;
      } else {
        alert('Failed to start deposit, see console.');
        console.log('Create payment response:', data);
      }
    } catch (err) {
      console.error(err);
      alert('Network error while starting deposit.');
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold text-white">Wallet</h1>

      {Banner}

      <section className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-white/60">Current Balance</div>
        <div className="mt-1 text-2xl font-semibold text-white">
          {balance.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          USDT
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 text-sm text-white/60">Deposit</div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleDeposit(25)}
            className="rounded-xl border border-cyan-400/30 bg-cyan-600/80 px-4 py-2 font-semibold text-black hover:brightness-105"
          >
            Deposit $25
          </button>
          <button
            onClick={() => handleDeposit(50)}
            className="rounded-xl border border-cyan-400/30 bg-cyan-600/80 px-4 py-2 font-semibold text-black hover:brightness-105"
          >
            Deposit $50
          </button>
          <button
            onClick={() => handleDeposit(100)}
            className="rounded-xl border border-cyan-400/30 bg-cyan-600/80 px-4 py-2 font-semibold text-black hover:brightness-105"
          >
            Deposit $100
          </button>
        </div>

        <div className="mt-6 text-sm text-white/50">
          Withdrawals are processed by the admin wallet after verification.
        </div>
      </section>
    </main>
  );
}

export default function WalletPage() {
  // Wrap in Suspense to satisfy Next.js for useSearchParams
  return (
    <Suspense fallback={<main className="p-8 text-white/70">Loading…</main>}>
      <WalletContent />
    </Suspense>
  );
}
