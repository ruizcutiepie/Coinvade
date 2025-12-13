'use client';

import React, { useEffect, useMemo, useState } from 'react';

type DepositRow = {
  id: string;
  userId: string;
  coin: string;
  network: string;
  txHash: string | null;
  amount: number | null;
  status: string;
  createdAt: string;
  updatedAt?: string;
  user?: { email: string | null } | null;
};

function fmt(n: number | null | undefined, d = 2) {
  const v = Number(n ?? 0);
  return v.toLocaleString(undefined, {
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

export default function AdminDepositsPage() {
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' | 'ALL'>('PENDING');
  const [q, setQ] = useState('');

  const [rows, setRows] = useState<DepositRow[]>([]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return rows;
    return rows.filter((r) => {
      const email = (r.user?.email ?? '').toLowerCase();
      const coin = (r.coin ?? '').toLowerCase();
      const net = (r.network ?? '').toLowerCase();
      const st = (r.status ?? '').toLowerCase();
      const tx = (r.txHash ?? '').toLowerCase();
      return (
        email.includes(qq) ||
        coin.includes(qq) ||
        net.includes(qq) ||
        st.includes(qq) ||
        tx.includes(qq) ||
        r.id.toLowerCase().includes(qq) ||
        r.userId.toLowerCase().includes(qq)
      );
    });
  }, [rows, q]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status !== 'ALL') params.set('status', status);
      // optional: limit
      params.set('limit', '200');

      const res = await fetch(`/api/admin/deposits?${params.toString()}`, {
        cache: 'no-store',
      });
      const j = await safeJson(res);

      if (!res.ok || !j?.ok) {
        throw new Error(j?.error || `Failed to load deposits (${res.status})`);
      }

      setRows((j.deposits ?? []) as DepositRow[]);
    } catch (e: any) {
      setRows([]);
      setError(e?.message || 'Failed to load deposits');
    } finally {
      setLoading(false);
    }
  }

  async function act(id: string, action: 'APPROVE' | 'REJECT' | 'MARK_PAID') {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/deposits/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const j = await safeJson(res);
      if (!res.ok || !j?.ok) throw new Error(j?.error || 'Action failed');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-cyan-300">Admin · Deposits</h1>
            <p className="mt-1 text-xs text-white/60">
              Review and process deposits (Approve → Mark Paid).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/60 p-3">
            <span className="text-[11px] uppercase tracking-[0.16em] text-white/50">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="rounded-xl border border-white/10 bg-black px-3 py-1.5 text-xs text-white/80 outline-none"
            >
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="PAID">PAID</option>
              <option value="REJECTED">REJECTED</option>
              <option value="ALL">ALL</option>
            </select>
          </div>

          <div className="flex-1 min-w-[240px] rounded-2xl border border-white/10 bg-black/60 p-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search email / coin / network / txHash / status..."
              className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-xs text-white/80 outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-white/60">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/60 p-6 text-sm text-white/60">
            No deposits found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/60">
            <table className="min-w-full text-xs">
              <thead className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                <tr className="border-b border-white/10">
                  <th className="px-3 py-3 text-left">Created</th>
                  <th className="px-3 py-3 text-left">User</th>
                  <th className="px-3 py-3 text-left">Coin</th>
                  <th className="px-3 py-3 text-left">Network</th>
                  <th className="px-3 py-3 text-left">TxHash</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((d) => {
                  const isBusy = busyId === d.id;
                  const st = String(d.status || '').toUpperCase();
                  return (
                    <tr key={d.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="px-3 py-3 text-white/70">{fmtDate(d.createdAt)}</td>
                      <td className="px-3 py-3 text-white/85">{d.user?.email ?? d.userId}</td>
                      <td className="px-3 py-3 text-white/85">{d.coin}</td>
                      <td className="px-3 py-3 text-white/85">{d.network}</td>
                      <td className="px-3 py-3 max-w-[260px] truncate text-white/65">
                        {d.txHash ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-right text-white/85">{fmt(d.amount)}</td>
                      <td className="px-3 py-3">
                        <span
                          className={
                            st === 'PENDING'
                              ? 'text-amber-200'
                              : st === 'APPROVED'
                              ? 'text-cyan-200'
                              : st === 'PAID'
                              ? 'text-emerald-200'
                              : st === 'REJECTED'
                              ? 'text-rose-200'
                              : 'text-white/70'
                          }
                        >
                          {st || '—'}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-right">
                        {/* APPROVE/REJECT only useful if pending */}
                        <button
                          disabled={isBusy}
                          onClick={() => act(d.id, 'APPROVE')}
                          className="mr-2 rounded-lg bg-cyan-500/90 px-3 py-1 text-[11px] font-semibold text-black hover:bg-cyan-400 disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          disabled={isBusy}
                          onClick={() => act(d.id, 'REJECT')}
                          className="mr-2 rounded-lg bg-rose-500/90 px-3 py-1 text-[11px] font-semibold text-black hover:bg-rose-400 disabled:opacity-60"
                        >
                          Reject
                        </button>
                        <button
                          disabled={isBusy}
                          onClick={() => act(d.id, 'MARK_PAID')}
                          className="rounded-lg bg-emerald-500/90 px-3 py-1 text-[11px] font-semibold text-black hover:bg-emerald-400 disabled:opacity-60"
                        >
                          Mark Paid
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="px-4 py-3 text-[11px] text-white/50">
              Flow: user submits deposit → Admin approves → Admin marks paid.
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
