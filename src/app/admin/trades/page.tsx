// src/app/admin/trades/page.tsx
import React from 'react';
import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

type TradeWithUser = Prisma.TradeGetPayload<{
  include: { user: { select: { email: true; name: true } } };
}>;

function toNumber(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  // Prisma.Decimal support
  if (typeof v === 'object' && v && typeof (v as any).toNumber === 'function') {
    try {
      return (v as any).toNumber();
    } catch {}
  }
  const n = Number(v as any);
  return Number.isFinite(n) ? n : 0;
}

function fmt(n: number, d = 2) {
  const num = Number(n || 0);
  return num.toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

function fmtPrice(n: number) {
  if (!Number.isFinite(n) || n <= 0) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export default async function AdminTradesPage() {
  const trades: TradeWithUser[] = await prisma.trade.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      user: { select: { email: true, name: true } },
    },
  });

  return (
    <main className="min-h-screen px-6 pb-16 pt-6 text-white">
      <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-black/40 p-6 shadow-[0_0_40px_rgba(0,0,0,.6)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Admin • Trades</h1>
          <div className="text-xs text-white/60">
            Showing latest <span className="text-white/80">{Math.min(trades.length, 200)}</span>
          </div>
        </div>

        {!trades.length ? (
          <div className="rounded-xl border border-white/10 bg-black/30 p-5 text-white/70">
            No trades found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/30">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-[0.16em] text-white/50">
                <tr>
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Pair</th>
                  <th className="px-4 py-3 text-left">Dir</th>
                  <th className="px-4 py-3 text-right">Stake</th>
                  <th className="px-4 py-3 text-right">Entry</th>
                  <th className="px-4 py-3 text-right">Exit</th>
                  <th className="px-4 py-3 text-right">Payout</th>
                  <th className="px-4 py-3 text-right">PNL</th>
                  <th className="px-4 py-3 text-center">Result</th>
                </tr>
              </thead>

              <tbody>
                {trades.map((t: TradeWithUser) => {
                  const stake = toNumber(t.amount);
                  const payout = toNumber(t.payout);

                  const pnl = payout - stake;

                  const entry = toNumber(t.entryPrice);
                  const exit = toNumber(t.exitPrice ?? t.closePrice);

                  const resultLabel =
                    t.won === true ? 'WIN' : t.won === false ? 'LOSS' : 'TIE/OPEN';

                  const resultClass =
                    t.won === true
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : t.won === false
                      ? 'bg-rose-500/15 text-rose-300'
                      : 'bg-white/10 text-white/80';

                  const pnlClass =
                    pnl > 0 ? 'text-emerald-300' : pnl < 0 ? 'text-rose-300' : 'text-white/70';

                  return (
                    <tr key={t.id} className="border-t border-white/10">
                      <td className="px-4 py-3 text-white/80">
                        {new Date(t.createdAt).toLocaleString()}
                      </td>

                      <td className="px-4 py-3 text-white/80">
                        <div className="truncate">{t.user?.email || t.user?.name || t.userId}</div>
                      </td>

                      <td className="px-4 py-3 text-white/90">
                        {t.pair.includes('/') ? t.pair : `${t.pair.replace('USDT', '')}/USDT`}
                      </td>

                      <td className="px-4 py-3 text-white/80">{String(t.direction)}</td>

                      <td className="px-4 py-3 text-right text-white/90">{fmt(stake, 2)}</td>

                      <td className="px-4 py-3 text-right text-white/80">{fmtPrice(entry)}</td>

                      <td className="px-4 py-3 text-right text-white/80">{fmtPrice(exit)}</td>

                      <td className="px-4 py-3 text-right text-white/90">{fmt(payout, 2)}</td>

                      <td className={`px-4 py-3 text-right font-semibold ${pnlClass}`}>
                        {pnl >= 0 ? '+' : ''}
                        {fmt(pnl, 2)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className={`rounded px-2 py-1 text-xs ${resultClass}`}>{resultLabel}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}