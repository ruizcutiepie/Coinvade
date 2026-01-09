'use client';

import React from 'react';
import Link from 'next/link';

import AppShell from '../components/AppShell';
import TickerCard from '../components/TickerCard';

export default function MarketsClient() {
  const pairs = [
    { symbol: 'BTCUSDT' },
    { symbol: 'ETHUSDT' },
    { symbol: 'SOLUSDT' },
  ];

  return (
    <AppShell title="Markets">
      <main className="mx-auto max-w-7xl px-6 py-6">
        <header className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
          >
            ← Back
          </Link>

          <h1 className="text-3xl font-bold text-white">Markets (Live)</h1>
          <span />
        </header>

        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pairs.map((p) => (
            <TickerCard key={p.symbol} symbol={p.symbol} />
          ))}
        </section>
      </main>
    </AppShell>
  );
}
