// src/app/components/RecentTrades.tsx
'use client';

export type TradeResult = {
  id: string;
  ts: number;
  pair: string;           // "BTCUSDT"
  direction: 'long' | 'short';
  amount: number;         // USDT
  duration: number;       // seconds
  entryPrice: number;
  exitPrice: number;
  won: boolean;
  payout: number;
};

export default function RecentTrades({ items }: { items: TradeResult[] }) {
  if (!items?.length) {
    return (
      <div className="mt-10 rounded-2xl border border-white/10 bg-black/20 p-6 text-white/70">
        No trades yet. Your results will appear here.
      </div>
    );
  }

  return (
    <div className="mt-10 rounded-2xl border border-white/10 bg-black/20 p-2 sm:p-4">
      <h2 className="px-2 py-3 text-lg font-semibold text-white">Recent Trades</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
          <thead className="text-white/60">
            <tr className="border-b border-white/10">
              <th className="px-3 py-2 text-left">Time</th>
              <th className="px-3 py-2 text-left">Pair</th>
              <th className="px-3 py-2 text-left">Side</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2 text-right">Entry</th>
              <th className="px-3 py-2 text-right">Exit</th>
              <th className="px-3 py-2 text-right">Payout</th>
              <th className="px-3 py-2 text-center">Result</th>
            </tr>
          </thead>
          <tbody>
            {items
              .slice(0, 20)
              .sort((a, b) => b.ts - a.ts)
              .map((t) => (
                <tr key={t.id} className="border-b border-white/10 last:border-b-0">
                  <td className="px-3 py-2 text-white/80">
                    {new Date(t.ts).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">{t.pair.includes('/') ? t.pair : `${t.pair.replace('USDT', '')}/USDT`}</td>
                  <td className="px-3 py-2">{t.direction === 'long' ? 'Buy' : 'Sell'}</td>
                  <td className="px-3 py-2 text-right">{t.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-right">{t.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                  <td className="px-3 py-2 text-right">{t.exitPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                  <td className="px-3 py-2 text-right">
                    {t.payout.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`rounded px-2 py-0.5 text-xs ${t.won ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                      {t.won ? 'Win' : 'Loss'}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
