'use client';

import React, { useEffect, useMemo, useState } from 'react';

type DepositRow = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | string;
  coin: string;
  network: string;
  txHash: string | null;
  amount: number | null;
  user: { id: string; email: string | null };
};

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}

function fmtNum(n: number, d = 2) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

export default function AdminDepositsPage() {
  const [rows, setRows] = useState<DepositRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [q, setQ] = useState('');

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/deposits', { cache: 'no-store' });
      const j = await res.json();

      if (!res.ok || !j?.ok) {
        throw new Error(j?.error || 'Failed to load deposits');
      }

      setRows(j.deposits || []);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load deposits');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function act(id: string, action: 'approve' | 'reject') {
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/deposits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) {
        throw new Error(j?.error || 'Action failed');
      }

      const updated: DepositRow = j.deposit;
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (e: any) {
      alert(e?.message || 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => {
      const hay = [
        r.user?.email ?? '',
        r.coin,
        r.network,
        r.status,
        r.id,
        r.txHash ?? '',
        r.amount ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, q]);

  const counts = useMemo(() => {
    const c = { PENDING: 0, CONFIRMED: 0, FAILED: 0 };
    for (const r of rows) {
      if (r.status in c) (c as any)[r.status] += 1;
    }
    return c;
  }, [rows]);

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--neon)]">
              Admin · Deposits
            </h1>
            <p className="mt-1 text-xs text-white/60">
              Review deposit intents. Approve will mark CONFIRMED and credit the wallet.
            </p>

            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70">
                Pending: <span className="text-amber-300">{counts.PENDING}</span>
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70">
                Confirmed: <span className="text-emerald-300">{counts.CONFIRMED}</span>
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70">
                Failed: <span className="text-rose-300">{counts.FAILED}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <div className="flex gap-2">
              <a
                href="/admin"
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:border-white/40"
              >
                Admin Home
              </a>
              <a
                href="/admin/users"
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:border-white/40"
              >
                Users
              </a>
              <a
                href="/admin/trades"
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:border-white/40"
              >
                Trades
              </a>
              <a
                href="/admin/withdrawals"
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:border-white/40"
              >
                Withdrawals
              </a>
            </div>

            <div className="flex gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search email / coin / status / txHash…"
                className="w-72 max-w-full rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-xs text-white/90 outline-none focus:border-cyan-400/60"
              />
              <button
                onClick={load}
                className="rounded-xl bg-cyan-500 px-3 py-2 text-xs font-semibold text-black shadow-[0_0_18px_rgba(34,211,238,.5)] hover:bg-cyan-400"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/60">
          <table className="min-w-full text-xs">
            <thead className="bg-white/5 text-[11px] uppercase tracking-[0.16em] text-white/60">
              <tr>
                <th className="px-3 py-2 text-left">Created</th>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Asset</th>
                <th className="px-3 py-2 text-left">Network</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-left">Tx Hash</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-white/50">
                    Loading…
                  </td>
                </tr>
              )}

              {!loading && err && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-rose-300">
                    {err}
                  </td>
                </tr>
              )}

              {!loading &&
                !err &&
                filtered.map((r) => {
                  const isBusy = busyId === r.id;

                  const statusPill =
                    r.status === 'PENDING'
                      ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
                      : r.status === 'CONFIRMED'
                      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                      : 'border-rose-400/30 bg-rose-400/10 text-rose-200';

                  return (
                    <tr key={r.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="px-3 py-2 text-[11px] text-white/60">
                        {fmtDate(r.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-white/80">
                        {r.user?.email ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-white/90">{r.coin}</td>
                      <td className="px-3 py-2 text-[11px] text-white/70">{r.network}</td>

                      <td className="px-3 py-2 text-right font-mono text-[11px] text-white">
                        {r.amount == null ? '—' : fmtNum(r.amount, 2)}
                      </td>

                      <td className="px-3 py-2 text-[11px] font-mono text-white/70">
                        <span
                          title={r.txHash ?? ''}
                          className="inline-block max-w-[280px] truncate align-bottom"
                        >
                          {r.txHash ?? '—'}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-[11px]">
                        <span className={`rounded-full border px-2 py-1 ${statusPill}`}>
                          {r.status}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          {r.status === 'PENDING' && (
                            <>
                              <button
                                disabled={isBusy}
                                onClick={() => act(r.id, 'approve')}
                                className="rounded-lg bg-emerald-500 px-2 py-1 text-[11px] font-semibold text-black hover:bg-emerald-400 disabled:opacity-60"
                              >
                                Approve
                              </button>
                              <button
                                disabled={isBusy}
                                onClick={() => act(r.id, 'reject')}
                                className="rounded-lg border border-rose-400/40 bg-rose-400/10 px-2 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-400/20 disabled:opacity-60"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {(r.status === 'CONFIRMED' || r.status === 'FAILED') && (
                            <span className="text-[11px] text-white/35">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

              {!loading && !err && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-white/50">
                    No deposits found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] text-white/45">
          Flow: user submits deposit intent → Admin approves → deposit becomes CONFIRMED → wallet credited.
        </p>
      </div>
    </main>
  );
}
