// src/app/admin/users/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';

type WalletMini = { coin: string; balance: number };

type UserRow = {
  id: string;
  email: string | null;
  role: 'ADMIN' | 'USER' | string;
  createdAt: string;
  wallets: WalletMini[]; // we only fetch USDT wallet in the API
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

export default function AdminUsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
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

  async function setRole(id: string, role: 'ADMIN' | 'USER') {
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, role }),
      });
      const j = await res.json();

      if (!res.ok || !j?.ok) {
        throw new Error(j?.error || 'Failed to update role');
      }

      const updated: UserRow = j.user;
      setRows((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (e: any) {
      alert(e?.message || 'Failed to update role');
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((u) => {
      const usdt = (u.wallets?.[0]?.balance ?? 0).toString();
      const hay = [u.email ?? '', u.role ?? '', u.id ?? '', usdt]
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, q]);

  const counts = useMemo(() => {
    const c = { ADMIN: 0, USER: 0 };
    for (const r of rows) {
      if (r.role === 'ADMIN') c.ADMIN += 1;
      else c.USER += 1;
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
              Admin · Users
            </h1>
            <p className="mt-1 text-xs text-white/60">
              Manage user roles and view USDT balances.
            </p>

            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70">
                Admins:{' '}
                <span className="text-cyan-300">{counts.ADMIN}</span>
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70">
                Users:{' '}
                <span className="text-white/85">{counts.USER}</span>
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70">
                Total:{' '}
                <span className="text-white/85">{rows.length}</span>
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
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-10 text-center text-white/50"
                  >
                    Loading…
                  </td>
                </tr>
              )}

              {!loading && err && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-10 text-center text-rose-300"
                  >
                    {err}
                  </td>
                </tr>
              )}

              {!loading &&
                !err &&
                filtered.map((u) => {
                  const usdt = u.wallets?.[0]?.balance ?? 0;
                  const isBusy = busyId === u.id;

                  const rolePill =
                    u.role === 'ADMIN'
                      ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200'
                      : 'border-white/15 bg-white/5 text-white/75';

                  return (
                    <tr
                      key={u.id}
                      className="border-t border-white/5 hover:bg-white/5"
                    >
                      <td className="px-3 py-2 text-[11px] text-white/60">
                        {fmtDate(u.createdAt)}
                      </td>

                      <td className="px-3 py-2 text-[11px] text-white/90">
                        {u.email ?? '—'}
                      </td>

                      <td className="px-3 py-2 text-[11px]">
                        <span
                          className={`rounded-full border px-2 py-1 ${rolePill}`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-right font-mono text-[11px] text-white">
                        {fmtNum(usdt, 2)}
                      </td>

                      <td className="px-3 py-2 text-[11px] font-mono text-white/55">
                        <span
                          title={u.id}
                          className="inline-block max-w-[260px] truncate align-bottom"
                        >
                          {u.id}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          {u.role === 'ADMIN' ? (
                            <button
                              disabled={isBusy}
                              onClick={() => setRole(u.id, 'USER')}
                              className="rounded-lg border border-rose-400/40 bg-rose-400/10 px-2 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-400/20 disabled:opacity-60"
                            >
                              {isBusy ? '…' : 'Demote'}
                            </button>
                          ) : (
                            <button
                              disabled={isBusy}
                              onClick={() => setRole(u.id, 'ADMIN')}
                              className="rounded-lg bg-cyan-500 px-2 py-1 text-[11px] font-semibold text-black hover:bg-cyan-400 disabled:opacity-60"
                            >
                              {isBusy ? '…' : 'Promote'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

              {!loading && !err && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
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
          Tip: if you change your own role, sign out + sign in again so the
          session refreshes.
        </p>
      </div>
    </main>
  );
}
