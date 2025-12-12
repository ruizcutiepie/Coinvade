'use client';

import React, { useEffect, useState } from 'react';

type Metrics = {
  totalUsers: number;
  totalTrades: number;
  totalUsdtInWallets: number;
  pendingWithdrawals: number;
  pendingDeposits: number;
};

type AdminUser = {
  id: string;
  email: string | null;
  role: string;
  createdAt: string;
  wallets: { coin: string; balance: number }[];
};

type AdminTrade = {
  id: string;
  pair: string;
  direction: string;
  amount: number;
  createdAt: string;
  user?: { email: string | null };
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
  user?: { email: string | null };
};

function fmt(n: number, d = 2) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

function fmtDate(d: string) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

// prevents “Unexpected token <” when API returns HTML (redirect/404 page)
async function safeJson(res: Response) {
  const ct = res.headers.get('content-type') || '';
  const text = await res.text();

  if (!ct.includes('application/json')) {
    throw new Error(text.slice(0, 140) || 'Non-JSON response');
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON returned by API');
  }
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [trades, setTrades] = useState<AdminTrade[]>([]);
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setError(null);

    try {
      const [mRes, uRes, tRes, wRes] = await Promise.all([
        fetch('/api/admin/metrics', { cache: 'no-store' }),
        fetch('/api/admin/users?limit=10', { cache: 'no-store' }),
        fetch('/api/admin/trades?limit=10', { cache: 'no-store' }),
        fetch('/api/admin/withdrawals?status=PENDING', { cache: 'no-store' }),
      ]);

      const m = await safeJson(mRes);
      const u = await safeJson(uRes);
      const t = await safeJson(tRes);
      const w = await safeJson(wRes);

      if (!mRes.ok || !m?.ok) throw new Error(m?.error || 'Failed to load metrics');
      if (!uRes.ok || !u?.ok) throw new Error(u?.error || 'Failed to load users');
      if (!tRes.ok || !t?.ok) throw new Error(t?.error || 'Failed to load trades');
      if (!wRes.ok || !w?.ok) throw new Error(w?.error || 'Failed to load withdrawals');

      setMetrics(m.metrics);
      setUsers(u.users || []);
      setTrades(t.trades || []);
      setWithdrawals(w.withdrawals || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function actWithdrawal(id: string, action: 'approve' | 'reject' | 'paid') {
    setBusyId(id);
    setError(null);

    try {
      const res = await fetch('/api/admin/withdrawals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });

      const j = await safeJson(res);
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'Action failed');

      if (j.withdrawal?.id) {
        setWithdrawals((prev) => prev.map((x) => (x.id === j.withdrawal.id ? j.withdrawal : x)));
      } else {
        await loadAll();
      }
    } catch (e: any) {
      setError(e?.message || 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-[var(--neon)]">Admin Dashboard</h1>
            <p className="mt-1 text-xs text-white/60">KPIs + quick admin queue view</p>
          </div>

          <div className="flex gap-2">
            <a
              href="/admin/users"
              className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs text-white/80 hover:border-white/40"
            >
              Users
            </a>
            <a
              href="/admin/withdrawals"
              className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs text-white/80 hover:border-white/40"
            >
              Withdrawals
            </a>
            <a
              href="/admin/trades"
              className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs text-white/80 hover:border-white/40"
            >
              Trades
            </a>
            <button
              onClick={loadAll}
              className="rounded-xl bg-cyan-500 px-3 py-2 text-xs font-semibold text-black shadow-[0_0_18px_rgba(34,211,238,.5)] hover:bg-cyan-400"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        {/* KPI cards */}
        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/60 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-white/50">Total Users</div>
            <div className="mt-2 text-2xl font-semibold">{metrics ? metrics.totalUsers : '—'}</div>
          </div>

          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-white/50">Total USDT in Wallets</div>
            <div className="mt-2 text-2xl font-semibold text-cyan-200">
              {metrics ? `${fmt(metrics.totalUsdtInWallets)} USDT` : '—'}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/60 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-white/50">Total Trades</div>
            <div className="mt-2 text-2xl font-semibold">{metrics ? metrics.totalTrades : '—'}</div>
          </div>
        </section>

        {loading && <div className="mb-8 text-sm text-white/60">Loading…</div>}

        {/* Pending withdrawals (mini queue) */}
        <section className="mb-8 rounded-2xl border border-white/10 bg-black/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Pending Withdrawals</h2>
            <span className="text-xs text-white/60">{withdrawals.length} pending</span>
          </div>

          {withdrawals.length === 0 ? (
            <div className="py-6 text-sm text-white/50">No withdrawals found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-white/5 text-[11px] uppercase tracking-[0.16em] text-white/60">
                  <tr>
                    <th className="px-3 py-2 text-left">User</th>
                    <th className="px-3 py-2 text-left">Asset</th>
                    <th className="px-3 py-2 text-left">Network</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2 text-left">Address</th>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => {
                    const isBusy = busyId === w.id;

                    return (
                      <tr key={w.id} className="border-t border-white/5 hover:bg-white/5">
                        <td className="px-3 py-2 text-white/80">{w.user?.email ?? w.userId}</td>
                        <td className="px-3 py-2">{w.coin}</td>
                        <td className="px-3 py-2 text-white/70">{w.network}</td>
                        <td className="px-3 py-2 text-right font-mono">{fmt(w.amount)}</td>
                        <td className="px-3 py-2 font-mono text-white/70">
                          <span className="inline-block max-w-[240px] truncate" title={w.address}>
                            {w.address}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[11px] text-white/60">{fmtDate(w.createdAt)}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            disabled={isBusy}
                            onClick={() => actWithdrawal(w.id, 'approve')}
                            className="mr-2 rounded-lg bg-emerald-500 px-2 py-1 text-[11px] font-semibold text-black hover:bg-emerald-400 disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            disabled={isBusy}
                            onClick={() => actWithdrawal(w.id, 'reject')}
                            className="rounded-lg border border-rose-400/40 bg-rose-400/10 px-2 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-400/20 disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent users + trades */}
        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Users</h2>
              <span className="text-xs text-white/60">showing {users.length}</span>
            </div>

            {users.length === 0 ? (
              <div className="py-6 text-sm text-white/50">No users yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-white/5 text-[11px] uppercase tracking-[0.16em] text-white/60">
                    <tr>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Role</th>
                      <th className="px-3 py-2 text-right">USDT</th>
                      <th className="px-3 py-2 text-left">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const usdt = u.wallets?.find((w) => w.coin === 'USDT')?.balance ?? 0;
                      return (
                        <tr key={u.id} className="border-t border-white/5 hover:bg-white/5">
                          <td className="px-3 py-2 text-white/85">{u.email}</td>
                          <td className="px-3 py-2 text-white/70">{u.role}</td>
                          <td className="px-3 py-2 text-right font-mono">{fmt(usdt)}</td>
                          <td className="px-3 py-2 text-[11px] text-white/60">{fmtDate(u.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Trades</h2>
              <span className="text-xs text-white/60">showing {trades.length}</span>
            </div>

            {trades.length === 0 ? (
              <div className="py-6 text-sm text-white/50">No trades yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-white/5 text-[11px] uppercase tracking-[0.16em] text-white/60">
                    <tr>
                      <th className="px-3 py-2 text-left">User</th>
                      <th className="px-3 py-2 text-left">Pair</th>
                      <th className="px-3 py-2 text-left">Side</th>
                      <th className="px-3 py-2 text-right">Stake</th>
                      <th className="px-3 py-2 text-left">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((t) => (
                      <tr key={t.id} className="border-t border-white/5 hover:bg-white/5">
                        <td className="px-3 py-2 text-white/85">{t.user?.email ?? '—'}</td>
                        <td className="px-3 py-2">{t.pair}</td>
                        <td className="px-3 py-2">{t.direction}</td>
                        <td className="px-3 py-2 text-right font-mono">{fmt(t.amount)}</td>
                        <td className="px-3 py-2 text-[11px] text-white/60">{fmtDate(t.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
