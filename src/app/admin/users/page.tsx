// src/app/admin/users/page.tsx
import prisma from '@/lib/prisma';

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleString();
}

function fmtNum(n: number, d = 2) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

// Force server render (admin list should always be fresh)
export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,

      // USDT balance (wallet row where coin = 'USDT')
      wallets: {
        where: { coin: 'USDT' },
        select: { balance: true },
        take: 1,
      },

      // counts via relation aggregations
      _count: {
        select: {
          trades: true,
          deposits: true,
          withdrawals: true,
        },
      },

      // status breakdowns (simple, fast, reliable)
      deposits: {
        select: { status: true },
      },
      withdrawals: {
        select: { status: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--neon)]">
              Admin · Users
            </h1>
            <p className="mt-1 text-xs text-white/60">
              Showing {users.length} latest registered users.
            </p>
          </div>

          <div className="flex gap-2">
            <a
              href="/admin"
              className="rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:border-white/40"
            >
              Admin Home
            </a>
            <a
              href="/admin/trades"
              className="rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:border-white/40"
            >
              Trades
            </a>
            <a
              href="/trade"
              className="rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:border-white/40"
            >
              Back to Trading
            </a>
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
                <th className="px-3 py-2 text-right">Trades</th>

                <th className="px-3 py-2 text-right">Deposits</th>
                <th className="px-3 py-2 text-right">Dep Pending</th>
                <th className="px-3 py-2 text-right">Dep Confirmed</th>

                <th className="px-3 py-2 text-right">Withdrawals</th>
                <th className="px-3 py-2 text-right">Wd Pending</th>
                <th className="px-3 py-2 text-right">Wd Approved/Paid</th>

                <th className="px-3 py-2 text-left">User ID</th>
              </tr>
            </thead>

            <tbody>
              {users.map((u) => {
                const isAdmin = String(u.role).toUpperCase() === 'ADMIN';
                const usdt = u.wallets?.[0]?.balance ?? 0;

                const depPending = u.deposits.reduce(
                  (acc, d) => acc + (d.status === 'PENDING' ? 1 : 0),
                  0
                );
                const depConfirmed = u.deposits.reduce(
                  (acc, d) => acc + (d.status === 'CONFIRMED' ? 1 : 0),
                  0
                );

                const wdPending = u.withdrawals.reduce(
                  (acc, w) => acc + (w.status === 'PENDING' ? 1 : 0),
                  0
                );
                const wdApprovedPaid = u.withdrawals.reduce(
                  (acc, w) =>
                    acc + (w.status === 'APPROVED' || w.status === 'PAID' ? 1 : 0),
                  0
                );

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
                        className={`rounded-full px-2 py-1 ${
                          isAdmin
                            ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-400/30'
                            : 'bg-white/5 text-white/70 border border-white/10'
                        }`}
                      >
                        {isAdmin ? 'ADMIN' : 'USER'}
                      </span>
                    </td>

                    <td className="px-3 py-2 text-right text-[11px] font-mono text-white">
                      {fmtNum(usdt, 2)}
                    </td>

                    <td className="px-3 py-2 text-right text-[11px] text-white/80">
                      {u._count.trades}
                    </td>

                    <td className="px-3 py-2 text-right text-[11px] text-white/80">
                      {u._count.deposits}
                    </td>
                    <td className="px-3 py-2 text-right text-[11px] text-amber-300">
                      {depPending}
                    </td>
                    <td className="px-3 py-2 text-right text-[11px] text-emerald-300">
                      {depConfirmed}
                    </td>

                    <td className="px-3 py-2 text-right text-[11px] text-white/80">
                      {u._count.withdrawals}
                    </td>
                    <td className="px-3 py-2 text-right text-[11px] text-amber-300">
                      {wdPending}
                    </td>
                    <td className="px-3 py-2 text-right text-[11px] text-emerald-300">
                      {wdApprovedPaid}
                    </td>

                    <td className="px-3 py-2 text-[11px] font-mono text-white/60">
                      {u.id}
                    </td>
                  </tr>
                );
              })}

              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={12}
                    className="px-3 py-8 text-center text-xs text-white/50"
                  >
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] text-white/45">
          Next step: add “Verify Account” page + make it appear in nav (client requested).
        </p>
      </div>
    </main>
  );
}
