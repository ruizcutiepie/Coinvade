// src/app/components/BigMarketsMap.tsx
'use client';

import React, { useMemo, useState } from 'react';
import TickerCard from './TickerCard';

type MarketItem = { symbol: string; pair: string; coin: string };

const MARKETS: MarketItem[] = [
  { symbol: 'BTCUSDT', pair: 'BTC / USDT', coin: 'BTC' },
  { symbol: 'ETHUSDT', pair: 'ETH / USDT', coin: 'ETH' },
  { symbol: 'SOLUSDT', pair: 'SOL / USDT', coin: 'SOL' },
  { symbol: 'XRPUSDT', pair: 'XRP / USDT', coin: 'XRP' },
  { symbol: 'ADAUSDT', pair: 'ADA / USDT', coin: 'ADA' },
  { symbol: 'BNBUSDT', pair: 'BNB / USDT', coin: 'BNB' },
  { symbol: 'DOGEUSDT', pair: 'DOGE / USDT', coin: 'DOGE' },
  { symbol: 'DOTUSDT', pair: 'DOT / USDT', coin: 'DOT' },
];

export default function BigMarketsMap() {
  const [active, setActive] = useState<MarketItem>(MARKETS[0]);

  const tvSrc = useMemo(() => {
    // TradingView embed (candlestick, zoomable)
    // Uses BINANCE:SYMBOL
    const symbol = `BINANCE:${active.symbol}`;
    const params = new URLSearchParams({
      symbol,
      interval: '15',
      theme: 'dark',
      style: '1', // candlesticks
      locale: 'en',
      toolbarbg: '#0b1220',
      enable_publishing: 'false',
      allow_symbol_change: 'false',
      hide_top_toolbar: 'false',
      hide_side_toolbar: 'true',
      saveimage: 'false',
      studies: '[]',
    });

    return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
  }, [active.symbol]);

  return (
    <div className="space-y-8">
      {/* MAIN CHART (ONLY ONE — this replaces the old “first map”) */}
      <section className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-cyan-500/20 bg-gradient-to-b from-slate-900/80 via-slate-950/95 to-black/95 p-5 shadow-[0_0_40px_rgba(0,255,255,0.14)]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-white/70">
              Active Pair: <span className="text-cyan-200 font-semibold">{active.pair}</span>
            </div>

            <div className="text-xs text-white/50">Zoom with mouse wheel / pinch</div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/70">
            <iframe
              key={active.symbol}
              src={tvSrc}
              className="h-[420px] w-full"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              title={`chart-${active.symbol}`}
            />
          </div>
        </div>
      </section>

      {/* TILES / CARDS (hover + coin logos + live price) */}
      <section className="mx-auto max-w-6xl">
        <div className="mb-4 text-center">
          <h2 className="text-4xl font-extrabold text-white sm:text-5xl">Markets Overview</h2>
          <p className="mt-2 text-sm text-white/60">
            Hover over tiles to explore. Click any tile to update the main chart.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {MARKETS.map((m) => (
            <TickerCard
              key={m.symbol}
              symbol={m.symbol}
              pair={m.pair}
              coin={m.coin}
              onClick={() => setActive(m)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
