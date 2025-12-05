// src/app/admin/AdminDashboard.tsx
'use client';

import React, { useEffect, useState } from 'react';

type AdminSummary = {
  totalUsers: number;
  totalTrades: number;
  totalWalletUSDT: number;
  totalDepositedUSDT: number;
  totalWithdrawnUSDT: number;
};

type AdminUser = {
  id: string;
  email: string;
  createdAt: string;
  wallets: { coin: string; balance: number }[];
};

type AdminTrade = {
  id: string;
  pair: string;
  direction: string;
  amount: number;
  duration: number;
  won: boolean | null;
  payout: number;
  createdAt: string;
  user: { email: string | null };
};

type AdminDeposit = {
  id: string;
  userId: string;
  coin: string;
  network: string;
  amount: number | null;
  status: string;
  createdAt: string;
  user: { email: string | null };
};

type AdminWithdrawal = {
  id: string;
  userId: string;
  coin: string;
  network: string;
  address: string;
  amount: number;
  status: string;
  createdAt: string;
  user: { email: string | null };
};

function fmt(n: number, d = 2) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString();
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [deposits, setDeposits] = useState<AdminDeposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [trades, setTrades] = useState<AdminTrade[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  async function loadAll() {
    try {
      setLoading(true);
      setError(null);

      const [sumRes, depRes, wdRes, usersRes, tradesRes] = await Promise.all([
        fetch('/api/admin/summary'),
        fetch('/api/admin/deposits?status=PENDING'),
        fetch('/api/admin/withdrawals?status=PENDING'),
        fetch('/api/admin/users?limit=20'),
        fetch('/api/admin/trades?limit=20'),
      ]);

      const sumJson = await sumRes.json();
      const depJson = await depRes.json();
      const wdJson = await wdRes.json();
      const usersJson = await usersRes.json();
      const tradesJson = await tradesRes.json();

      if (!sumJson.ok) throw new Error(sumJson.error ?? 'Failed to load summary');
      if (!depJson.ok) throw new Error(depJson.error ?? 'Failed to load deposits');
      if (!wdJson.ok) throw new Error(wdJson.error ?? 'Failed to load withdrawals');
      if (!usersJson.ok) throw new Error(usersJson.error ?? 'Failed to load users');
      if (!tradesJson.ok) throw new Error(tradesJson.error ?? 'Failed to load trades');

      setSummary(sumJson.summary);
      setDeposits(depJson.deposits);
      setWithdrawals(wdJson.withdrawals);
      setUsers(usersJson.users);
      setTrades(tradesJson.trades);
    } catch (err: any) {
      console.error('[admin] loadAll error', err);
      setError(err?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleDepositAction(id: string, action: 'APPROVE' | 'REJECT') {
    try {
      setActionBusy(true);
      setError(null);
      const res = await fetch(`/api/admin/deposits/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error ?? 'Action failed');
      await loadAll();
    } catch (err: any) {
      console.error('[admin] deposit action error', err);
      setError(err?.message ?? 'Deposit action failed');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleWithdrawalAction(id: string, action: 'APPROVE' | 'REJECT') {
    try {
      setActionBusy(true);
      setError(null);
      const res = await fetch(`/api/admin/withdrawals/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error ?? 'Action failed');
      await loadAll();
    } catch (err: any) {
      console.error('[admin] withdrawal action error', err);
      setError(err?.message ?? 'Withdrawal action failed');
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-8 text-white">
      <h1 className="mb-6 text-3xl font-semibold text-cyan-300 neon-title">
        Admin Dashboard
      </h1>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <section className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-black/40 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-white/50">
            Total Users
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {summary ? summary.totalUsers : '—'}
          </div>
        </div>

        <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-white/50">
            Total USDT in Wallets
          </div>
          <div className="mt-2 text-2xl font-semibold text-cyan-200">
            {summary ? `${fmt(summary.totalWalletUSDT, 2)} USDT` : '—'}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/40 p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-white/50">
            Total Trades
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {summary ? summary.totalTrades : '—'}
          </div>
        </div>
      </section>

      {loading && (
        <div className="mb-6 text-sm text-white/60">
          Loading admin data…
        </div>
      )}

      {/* Pending deposits */}
      <section className="mb-8 rounded-2xl border border-white/10 bg-black/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Pending Deposits
          </h2>
          <span className="text-xs text-white/50">
            {deposits.length} pending
          </span>
        </div>

        {deposits.length === 0 ? (
          <div className="py-6 text-sm text-white/50">No deposits found.</div>
        ) : (
          <div className="overflow-x-auto text-sm">
            <table className="min-w-full border-separate border-spacing-y-1">
              <thead className="text-xs uppercase text-white/50">
                <tr>
                  <th className="px-3 py-2 text-left">User</th>
                  <th className="px-3 py-2 text-left">Coin</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-left">Network</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map((d) => (
                  <tr key={d.id} className="rounded-xl bg-white/5 align-middle">
                    <td className="px-3 py-2">{d.user?.email ?? d.userId}</td>
                    <td className="px-3 py-2">{d.coin}</td>
                    <td className="px-3 py-2 text-right">
                      {d.amount != null ? fmt(d.amount) : '—'}
                    </td>
                    <td className="px-3 py-2">{d.network}</td>
                    <td className="px-3 py-2 text-xs text-yellow-300">
                      {d.status}
                    </td>
                    <td className="px-3 py-2 text-xs text-white/60">
                      {fmtDate(d.createdAt)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        disabled={actionBusy}
                        onClick={() => handleDepositAction(d.id, 'APPROVE')}
                        className="mr-2 rounded-lg bg-emerald-500/90 px-3 py-1 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        disabled={actionBusy}
                        onClick={() => handleDepositAction(d.id, 'REJECT')}
                        className="rounded-lg bg-rose-500/90 px-3 py-1 text-xs font-semibold text-black hover:bg-rose-400 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Pending withdrawals */}
      <section className="mb-8 rounded-2xl border border-white/10 bg-black/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Pending Withdrawals
          </h2>
          <span className="text-xs text-white/50">
            {withdrawals.length} pending
          </span>
        </div>

        {withdrawals.length === 0 ? (
          <div className="py-6 text-sm text-white/50">No withdrawals found.</div>
        ) : (
          <div className="overflow-x-auto text-sm">
            <table className="min-w-full border-separate border-spacing-y-1">
              <thead className="text-xs uppercase text-white/50">
                <tr>
                  <th className="px-3 py-2 text-left">User</th>
                  <th className="px-3 py-2 text-left">Coin</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-left">Network</th>
                  <th className="px-3 py-2 text-left">Address</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id} className="bg-white/5 align-middle">
                    <td className="px-3 py-2">{w.user?.email ?? w.userId}</td>
                    <td className="px-3 py-2">{w.coin}</td>
                    <td className="px-3 py-2 text-right">{fmt(w.amount)}</td>
                    <td className="px-3 py-2">{w.network}</td>
                    <td className="px-3 py-2 max-w-[220px] truncate text-xs text-white/70">
                      {w.address}
                    </td>
                    <td className="px-3 py-2 text-xs text-yellow-300">
                      {w.status}
                    </td>
                    <td className="px-3 py-2 text-xs text-white/60">
                      {fmtDate(w.createdAt)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        disabled={actionBusy}
                        onClick={() => handleWithdrawalAction(w.id, 'APPROVE')}
                        className="mr-2 rounded-lg bg-emerald-500/90 px-3 py-1 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        disabled={actionBusy}
                        onClick={() => handleWithdrawalAction(w.id, 'REJECT')}
                        className="rounded-lg bg-rose-500/90 px-3 py-1 text-xs font-semibold text-black hover:bg-rose-400 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Users + trades */}
      <section className="grid gap-6 md:grid-cols-2">
        {/* Users */}
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Recent Users
            </h2>
            <span className="text-xs text-white/50">
              showing {users.length}
            </span>
          </div>
          {users.length === 0 ? (
            <div className="py-4 text-sm text-white/50">No users yet.</div>
          ) : (
            <div className="overflow-x-auto text-sm">
              <table className="min-w-full border-separate border-spacing-y-1">
                <thead className="text-xs uppercase text-white/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-right">USDT Balance</th>
                    <th className="px-3 py-2 text-left">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const usdt =
                      u.wallets.find((w) => w.coin === 'USDT')?.balance ?? 0;
                    return (
                      <tr key={u.id} className="bg-white/5">
                        <td className="px-3 py-2">{u.email}</td>
                        <td className="px-3 py-2 text-right">
                          {fmt(usdt)}
                        </td>
                        <td className="px-3 py-2 text-xs text-white/60">
                          {fmtDate(u.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Trades */}
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Recent Trades
            </h2>
            <span className="text-xs text-white/50">
              showing {trades.length}
            </span>
          </div>
          {trades.length === 0 ? (
            <div className="py-4 text-sm text-white/50">No trades yet.</div>
          ) : (
            <div className="overflow-x-auto text-sm">
              <table className="min-w-full border-separate border-spacing-y-1">
                <thead className="text-xs uppercase text-white/50">
                  <tr>
                    <th className="px-3 py-2 text-left">User</th>
                    <th className="px-3 py-2 text-left">Pair</th>
                    <th className="px-3 py-2 text-left">Side</th>
                    <th className="px-3 py-2 text-right">Stake</th>
                    <th className="px-3 py-2 text-right">Payout</th>
                    <th className="px-3 py-2 text-left">Result</th>
                    <th className="px-3 py-2 text-left">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t) => (
                    <tr key={t.id} className="bg-white/5">
                      <td className="px-3 py-2">
                        {t.user?.email ?? '—'}
                      </td>
                      <td className="px-3 py-2">{t.pair}</td>
                      <td className="px-3 py-2">{t.direction}</td>
                      <td className="px-3 py-2 text-right">
                        {fmt(t.amount)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {fmt(t.payout)}
                      </td>
                      <td className="px-3 py-2">
                        {t.won == null ? (
                          <span className="text-xs text-white/60">
                            Pending
                          </span>
                        ) : t.won ? (
                          <span className="text-xs text-emerald-300">Win</span>
                        ) : (
                          <span className="text-xs text-rose-300">Loss</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-white/60">
                        {fmtDate(t.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
