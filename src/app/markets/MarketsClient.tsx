'use client';

import TickerCard from '@/app/components/TickerCard';

export default function MarketsClient() {
  // Add/remove pairs here
  const pairs = [
    { symbol: 'BTCUSDT' },
    { symbol: 'ETHUSDT' },
    { symbol: 'SOLUSDT' },
  ];

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <a
          href="/"
          className="nav-link rounded-xl px-4 py-2 border border-white/10 hover:bg-white/5"
        >
          ← Back
        </a>
        <h1 className="neon-title text-3xl font-bold text-white">Markets (Live)</h1>
        <span />
      </header>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {pairs.map((p) => (
          <TickerCard key={p.symbol} symbol={p.symbol} />
        ))}
      </section>
    </main>
  );
}
