'use client';

import React, { useEffect, useMemo, useState } from 'react';

type WalletRow = { coin: string; balance: number };

type UserRow = {
  id: string;
  email: string | null;
  role: string;
  createdAt: string;
  wallets: WalletRow[];
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

function getUsdt(wallets: WalletRow[]) {
  const w = wallets?.find((x) => String(x.coin).toUpperCase() === 'USDT');
  return Number(w?.balance ?? 0);
}

export default function AdminUsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      const j = await res.json();

      if (!res.ok || !j?.ok) {
        throw new Error(j?.error || 'Failed to load users');
      }

      setRows(j.users || []);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load users');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((u) => {
      const hay = [u.email ?? '', u.role ?? '', u.id ?? '']
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, q]);

  const totalUsers = rows.length;
  const admins = rows.filter((u) => String(u.role).toUpperCase() === 'ADMIN')
    .length;
  const totalUsdt = rows.reduce((sum, u) => sum + getUsdt(u.wallets || []), 0);

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--neon)]">
              Admin · Users
            </h1>
            <p className="mt-1 text-xs text-white/60">
              View users, roles, and wallet balances.
            </p>

            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70">
                Total users:{' '}
                <span className="text-white/90 font-semibold">
                  {totalUsers}
                </span>
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70">
                Admins:{' '}
                <span className="text-cyan-300 font-semibold">{admins}</span>
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70">
                Total USDT:{' '}
                <span className="text-emerald-300 font-semibold">
                  {fmtNum(totalUsdt, 2)}
                </span>
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
            </div>

            <div className="flex gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search email / role / id…"
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

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/60">
          <table className="min-w-full text-xs">
            <thead className="bg-white/5 text-[11px] uppercase tracking-[0.16em] text-white/60">
              <tr>
                <th className="px-3 py-2 text-left">Created</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Role</th>
                <th className="px-3 py-2 text-right">USDT</th>
                <th className="px-3 py-2 text-left">User ID</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-10 text-center text-white/50"
                  >
                    Loading…
                  </td>
                </tr>
              )}

              {!loading && err && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-10 text-center text-rose-300"
                  >
                    {err}
                  </td>
                </tr>
              )}

              {!loading &&
                !err &&
                filtered.map((u) => {
                  const role = String(u.role || 'USER').toUpperCase();
                  const usdt = getUsdt(u.wallets || []);

                  const rolePill =
                    role === 'ADMIN'
                      ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200'
                      : 'border-white/10 bg-white/5 text-white/70';

                  return (
                    <tr
                      key={u.id}
                      className="border-t border-white/5 hover:bg-white/5"
                    >
                      <td className="px-3 py-2 text-[11px] text-white/60">
                        {fmtDate(u.createdAt)}
                      </td>

                      <td className="px-3 py-2 text-[11px] text-white/85">
                        {u.email ?? '—'}
                      </td>

                      <td className="px-3 py-2 text-[11px]">
                        <span
                          className={`rounded-full border px-2 py-1 ${rolePill}`}
                        >
                          {role}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-right font-mono text-[11px] text-white">
                        {fmtNum(usdt, 2)}
                      </td>

                      <td className="px-3 py-2 font-mono text-[11px] text-white/50">
                        <span
                          className="inline-block max-w-[340px] truncate align-bottom"
                          title={u.id}
                        >
                          {u.id}
                        </span>
                      </td>
                    </tr>
                  );
                })}

              {!loading && !err && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-10 text-center text-white/50"
                  >
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] text-white/45">
          This page reads from <span className="text-white/60">/api/admin/users</span>.
        </p>
      </div>
    </main>
  );
}
