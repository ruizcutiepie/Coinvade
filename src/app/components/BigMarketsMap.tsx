'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PairLabel from './PairLabel';

type Ticker = {
  symbol: string;
  price: number;
  percent: number;
};

const PAIRS = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'BNBUSDT',
  'XRPUSDT',
  'ADAUSDT',
  'DOGEUSDT',
  'LINKUSDT',
];

export default function BigMarketsMap() {
  const [tickers, setTickers] = useState<Record<string, Ticker>>({});
  const [tiltX, setTiltX] = useState(0);
  const [tiltY, setTiltY] = useState(0);

  async function fetchAll() {
    try {
      const results = await Promise.all(
        PAIRS.map(async (symbol) => {
          try {
            const res = await fetch(`/api/price?symbol=${symbol}`, {
              cache: 'no-store',
            });
            const j = await res.json();
            return {
              symbol,
              price: Number(j?.price ?? 0),
              percent: Number(j?.percent ?? 0),
            };
          } catch {
            return null;
          }
        })
      );

      setTickers((prev) => {
        const next = { ...prev };
        for (const r of results) if (r) next[r.symbol] = r;
        return next;
      });
    } catch {}
  }

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 8000);
    return () => clearInterval(id);
  }, []);

  const list = useMemo(
    () => PAIRS.map((s) => tickers[s]).filter(Boolean) as Ticker[],
    [tickers]
  );

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    const maxTilt = 6;

    setTiltX(-y * maxTilt);
    setTiltY(x * maxTilt);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div
        className="relative rounded-[1.75rem] border border-cyan-500/30 bg-gradient-to-br from-slate-950/90 via-slate-900/90 to-slate-950/90 p-[2px] shadow-[0_0_40px_rgba(0,224,255,0.3)]"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setTiltX(0);
          setTiltY(0);
        }}
        style={{
          transform: `perspective(1200px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
          transition: 'transform 0.12s ease-out',
        }}
      >
        <div className="rounded-[1.6rem] bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),transparent_55%),_#020617] p-4 sm:p-6">
          {/* HEADER */}
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-cyan-200/70">
                Live Market Map
              </div>
              <div className="mt-1 text-lg font-semibold text-white">
                Major USDT Pairs
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-white/50">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" /> Up 24h
              <span className="inline-flex h-2 w-2 rounded-full bg-rose-400" /> Down 24h
            </div>
          </div>

          {/* CARDS GRID */}
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((t) => {
              const up = t.percent >= 0;

              return (
                <Link
                  key={t.symbol}
                  href={`/trade?pair=${t.symbol}`}
                  className={`
                    group relative overflow-hidden rounded-2xl border p-3 text-sm transition
                    ${
                      up
                        ? 'border-emerald-500/40 bg-emerald-500/10 hover:border-emerald-400'
                        : 'border-rose-500/40 bg-rose-500/10 hover:border-rose-400'
                    }
                  `}
                >
                  <div className="relative flex items-center justify-between">
                    <div>
                      <PairLabel
                        symbol={t.symbol}
                        className="text-[11px]"
                        textClassName="text-[11px] uppercase tracking-[0.16em] text-white/70"
                      />
                      <div className="mt-2 text-base font-semibold text-white">
                        {t.price.toLocaleString()}
                      </div>
                    </div>

                    <div
                      className={`rounded-full px-2 py-[2px] text-[11px] font-semibold ${
                        up
                          ? 'bg-emerald-500/20 text-emerald-200'
                          : 'bg-rose-500/20 text-rose-200'
                      }`}
                    >
                      {up ? '+' : ''}
                      {t.percent.toFixed(2)}%
                    </div>
                  </div>

                  {/* MOTION BAR */}
                  <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-black/40">
                    <div
                      className={`absolute inset-y-0 left-0 w-1/2 blur-sm ${
                        up ? 'bg-emerald-400/70' : 'bg-rose-400/70'
                      }`}
                    />
                    <div
                      className={`relative h-full w-1/2 ${
                        up ? 'bg-emerald-400' : 'bg-rose-400'
                      }`}
                      style={{
                        transformOrigin: 'left',
                        transform: `scaleX(${Math.min(
                          1.5,
                          0.3 + Math.abs(t.percent) / 50
                        )})`,
                        transition: 'transform 0.2s ease-out',
                      }}
                    />
                  </div>

                  <div className="mt-2 flex justify-between text-[11px] text-white/45">
                    <span>Click to open trade</span>
                    <span>{up ? 'Bullish bias' : 'Bearish bias'}</span>
                  </div>
                </Link>
              );
            })}

            {!list.length && (
              <div className="col-span-full rounded-2xl border border-white/10 bg-black/40 p-4 text-center text-sm text-white/60">
                Loading live pairs…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
