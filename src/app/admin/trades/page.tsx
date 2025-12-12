// src/app/admin/trades/page.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function fmt(n: number, d = 2) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

export default async function AdminTradesPage() {
  const session = (await getServerSession(authOptions as any)) as any;

  const user = session?.user; // ✅ TS-safe now because session is any
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/trade');

  const trades = await prisma.trade.findMany({
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--neon)]">
              Admin · Trades
            </h1>
            <p className="mt-1 text-xs text-white/60">
              Showing the latest {trades.length} trades across all users.
            </p>
          </div>

          <div className="flex gap-2">
            <a
              href="/trade"
              className="rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:border-white/40"
            >
              Back to Trading
            </a>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/60">
          <table className="min-w-full text-xs">
            <thead className="bg-white/5 text-[11px] uppercase tracking-[0.16em] text-white/60">
              <tr>
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Pair</th>
                <th className="px-3 py-2 text-left">Dir</th>
                <th className="px-3 py-2 text-right">Stake</th>
                <th className="px-3 py-2 text-right">Entry</th>
                <th className="px-3 py-2 text-right">Exit</th>
                <th className="px-3 py-2 text-right">Payout</th>
                <th className="px-3 py-2 text-right">PnL</th>
              </tr>
            </thead>

            <tbody>
              {trades.map((t) => {
                const pnl = (t.payout ?? 0) - (t.amount ?? 0);
                const isWin = pnl > 0;

                return (
                  <tr
                    key={t.id}
                    className="border-t border-white/5 hover:bg-white/5"
                  >
                    <td className="px-3 py-2 text-[11px] text-white/60">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-white/80">
                      {t.user?.email ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-white/80">
                      {t.pair}
                    </td>
                    <td className="px-3 py-2 text-[11px]">
                      <span
                        className={
                          (t.direction ?? '').toUpperCase() === 'LONG'
                            ? 'text-emerald-400'
                            : 'text-red-400'
                        }
                      >
                        {(t.direction ?? '').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-[11px]">
                      ${fmt(t.amount ?? 0)}
                    </td>
                    <td className="px-3 py-2 text-right text-[11px]">
                      {t.entryPrice != null ? fmt(t.entryPrice) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-[11px]">
                      {t.exitPrice != null ? fmt(t.exitPrice) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-[11px]">
                      ${fmt(t.payout ?? 0)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right text-[11px] ${
                        isWin ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {pnl > 0 ? '+' : ''}
                      {fmt(pnl)}
                    </td>
                  </tr>
                );
              })}

              {trades.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-6 text-center text-xs text-white/50"
                  >
                    No trades yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
