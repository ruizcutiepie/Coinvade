'use client';

import React, { useEffect, useMemo, useState } from 'react';

type MetricsUser = {
  id: string;
  email: string | null;
  role: string;
  createdAt: string;
};

type MetricsTrade = {
  id: string;
  pair: string;
  direction: string;
  amount: number;
  payout: number;
  won: boolean | null;
  createdAt: string;
  user?: { email: string | null } | null;
};

type AdminMetrics = {
  totalUsers: number;
  totalUsdtInWallets: number;
  totalTrades: number;
  pendingWithdrawals: number;
  pendingDeposits: number;
  recentUsers: MetricsUser[];
  recentTrades: MetricsTrade[];
};

function fmt(n: number, d = 2) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response from ${res.url} (status ${res.status})`);
  }
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/metrics', { cache: 'no-store' });
      const j = await safeJson(res);

      if (!res.ok || !j?.ok) {
        throw new Error(j?.error || `Failed to load metrics (${res.status})`);
      }

      setMetrics(j.metrics as AdminMetrics);
    } catch (e: any) {
      setMetrics(null);
      setError(e?.message || 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const recentUsers = useMemo(() => metrics?.recentUsers ?? [], [metrics]);
  const recentTrades = useMemo(() => metrics?.recentTrades ?? [], [metrics]);

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-[var(--neon)]">
              Admin Dashboard
            </h1>
            <p className="mt-1 text-xs text-white/60">
              KPIs + recent activity (powered by /api/admin/metrics)
            </p>
          </div>

          <div className="flex gap-2">
            <a
              href="/admin/users"
              className="rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:border-white/40"
            >
              Users
            </a>
            <a
              href="/admin/withdrawals"
              className="rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:border-white/40"
            >
              Withdrawals
            </a>
            <a
              href="/admin/trades"
              className="rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:border-white/40"
            >
              Trades
            </a>
            <button
              onClick={load}
              className="rounded-xl bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-black shadow-[0_0_18px_rgba(34,211,238,.5)] hover:bg-cyan-400"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        {/* KPI CARDS */}
        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/60 p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/50">
              Total Users
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {metrics ? metrics.totalUsers : '—'}
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/50">
              Total USDT in Wallets
            </div>
            <div className="mt-2 text-2xl font-semibold text-cyan-200">
              {metrics ? `${fmt(metrics.totalUsdtInWallets)} USDT` : '—'}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/60 p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/50">
              Total Trades
            </div>
            <div className="mt-2 text-2xl font-semibold">
              {metrics ? metrics.totalTrades : '—'}
            </div>
          </div>
        </section>

        {/* QUEUE COUNTS */}
        <section className="mb-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/60 p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/50">
              Pending Deposits
            </div>
            <div className="mt-2 text-xl font-semibold text-amber-200">
              {metrics ? metrics.pendingDeposits : '—'}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/60 p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/50">
              Pending Withdrawals
            </div>
            <div className="mt-2 text-xl font-semibold text-amber-200">
              {metrics ? metrics.pendingWithdrawals : '—'}
            </div>
          </div>
        </section>

        {loading && (
          <div className="mb-6 text-sm text-white/60">Loading…</div>
        )}

        {/* RECENTS */}
        <section className="grid gap-6 md:grid-cols-2">
          {/* Recent Users */}
          <div className="rounded-2xl border border-white/10 bg-black/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Users</h2>
              <span className="text-xs text-white/50">
                showing {recentUsers.length}
              </span>
            </div>

            {recentUsers.length === 0 ? (
              <div className="py-4 text-sm text-white/50">No users yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="text-[11px] uppercase tracking-[0.16em] text-white/60">
                    <tr>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Role</th>
                      <th className="px-3 py-2 text-left">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map((u) => (
                      <tr key={u.id} className="border-t border-white/5 hover:bg-white/5">
                        <td className="px-3 py-2 text-white/85">
                          {u.email ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-white/70">{u.role}</td>
                        <td className="px-3 py-2 text-white/60">
                          {fmtDate(u.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Trades */}
          <div className="rounded-2xl border border-white/10 bg-black/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Trades</h2>
              <span className="text-xs text-white/50">
                showing {recentTrades.length}
              </span>
            </div>

            {recentTrades.length === 0 ? (
              <div className="py-4 text-sm text-white/50">No trades yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="text-[11px] uppercase tracking-[0.16em] text-white/60">
                    <tr>
                      <th className="px-3 py-2 text-left">User</th>
                      <th className="px-3 py-2 text-left">Pair</th>
                      <th className="px-3 py-2 text-left">Dir</th>
                      <th className="px-3 py-2 text-right">Stake</th>
                      <th className="px-3 py-2 text-right">Payout</th>
                      <th className="px-3 py-2 text-left">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTrades.map((t) => (
                      <tr key={t.id} className="border-t border-white/5 hover:bg-white/5">
                        <td className="px-3 py-2 text-white/80">
                          {t.user?.email ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-white/80">{t.pair}</td>
                        <td className="px-3 py-2">
                          <span
                            className={
                              String(t.direction).toUpperCase() === 'LONG'
                                ? 'text-emerald-300'
                                : 'text-rose-300'
                            }
                          >
                            {String(t.direction).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-white/85">
                          {fmt(t.amount)}
                        </td>
                        <td className="px-3 py-2 text-right text-white/85">
                          {fmt(t.payout)}
                        </td>
                        <td className="px-3 py-2">
                          {t.won == null ? (
                            <span className="text-white/60">Pending</span>
                          ) : t.won ? (
                            <span className="text-emerald-300">Win</span>
                          ) : (
                            <span className="text-rose-300">Loss</span>
                          )}
                        </td>
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
