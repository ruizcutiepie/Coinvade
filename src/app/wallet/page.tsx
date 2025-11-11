// src/app/wallet/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type DepositAmount = 25 | 50 | 100;

type Deposit = {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};

type Wallet = {
  balance: number;
  deposits: Deposit[];
};

export default function WalletPage() {
  const search = useSearchParams();
  const depositStatus = search.get('deposit'); // "success" | "cancel" | null

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchWallet() {
    try {
      const res = await fetch('/api/wallet', { cache: 'no-store' });
      const data = (await res.json()) as Wallet;
      setWallet(data);
    } catch (e) {
      console.error('Failed to fetch wallet', e);
    }
  }

  useEffect(() => {
    fetchWallet();
  }, []);

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

  // Creates a PENDING deposit that the admin will later approve.
  async function handleDeposit(amount: DepositAmount) {
    try {
      setLoading(true);
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Create deposit failed:', err);
        alert('Failed to create deposit.');
      }
      await fetchWallet();
    } catch (err) {
      console.error(err);
      alert('Network error while creating deposit.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-white">
      <h1 className="mb-6 text-3xl font-bold">Wallet</h1>

      {Banner}

      {/* Balance */}
      <section className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-white/60">Current Balance</div>
        <div className="mt-1 text-2xl font-semibold">
          {wallet
            ? `${wallet.balance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} USDT`
            : '...'}
        </div>
      </section>

      {/* Deposit buttons -> create pending request for admin */}
      <section className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 text-sm text-white/60">Deposit (Admin approval required)</div>
        <div className="flex flex-wrap gap-2">
          {[25, 50, 100].map((amt) => (
            <button
              key={amt}
              disabled={loading}
              onClick={() => handleDeposit(amt as DepositAmount)}
              className="rounded-xl border border-cyan-400/30 bg-cyan-600/80 px-4 py-2 font-semibold text-black hover:brightness-105 disabled:opacity-60"
            >
              Deposit ${amt}
            </button>
          ))}
        </div>

        <div className="mt-6 text-sm text-white/50">
          Withdrawals are processed by the admin wallet after verification.
        </div>
      </section>

      {/* Pending & history */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="mb-3 text-lg font-semibold">Deposits</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-white/70">
                <th className="py-2">ID</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Status</th>
                <th className="py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {wallet?.deposits?.length ? (
                wallet.deposits.map((d) => (
                  <tr key={d.id} className="border-t border-white/10">
                    <td className="py-2">{d.id.slice(0, 6)}…</td>
                    <td className="py-2">${d.amount}</td>
                    <td className="py-2">
                      {d.status === 'pending' && <span className="text-amber-300">Pending</span>}
                      {d.status === 'approved' && <span className="text-teal-300">Approved</span>}
                      {d.status === 'rejected' && <span className="text-rose-300">Rejected</span>}
                    </td>
                    <td className="py-2">{new Date(d.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-4 text-white/50">
                    No deposits yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
