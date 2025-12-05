// src/app/components/HeroChart.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';

type Kline = {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  closeTime: number;
  volume: number;
};

type Props = {
  symbol?: string; // e.g. "BTCUSDT"
};

const TIMEFRAMES = [
  { label: '1m', interval: '1m' },
  { label: '5m', interval: '5m' },
  { label: '30m', interval: '30m' },
  { label: '1h', interval: '1h' },
  { label: '1d', interval: '1d' },
  { label: '1w', interval: '1w' },
];

export default function HeroChart({ symbol = 'BTCUSDT' }: Props) {
  const [tf, setTf] = useState(TIMEFRAMES[0]);
  const [klines, setKlines] = useState<Kline[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [changePct, setChangePct] = useState<number | null>(null);

  // Load klines from our /api/kline proxy
  async function loadKlines() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `/api/kline?symbol=${symbol}&interval=${tf.interval}`,
        { cache: 'no-store' }
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? 'Failed to load');
        return;
      }

      const ks = (data.klines ?? []) as Kline[];
      setKlines(ks);

      if (ks.length > 0) {
        const first = ks[0];
        const last = ks[ks.length - 1];
        setLastPrice(last.close);
        const diff = last.close - first.open;
        setChangePct((diff / first.open) * 100);
      }
    } catch (e) {
      console.error(e);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  // Initial + refresh every ~15s
  useEffect(() => {
    loadKlines();
    const id = setInterval(loadKlines, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, tf.interval]);

  // Map klines to SVG coordinates
  const { candles, minPrice, maxPrice } = useMemo(() => {
    if (!klines.length) {
      return { candles: [] as any[], minPrice: 0, maxPrice: 1 };
    }

    const lows = klines.map((k) => k.low);
    const highs = klines.map((k) => k.high);
    const min = Math.min(...lows);
    const max = Math.max(...highs);
    const span = max - min || 1;
    const n = klines.length;
    const step = 100 / (n || 1); // horizontal step in svg units

    const mapped = klines.map((k, idx) => {
      const xCenter = idx * step + step / 2;
      const yHigh = 100 - ((k.high - min) / span) * 100;
      const yLow = 100 - ((k.low - min) / span) * 100;
      const yOpen = 100 - ((k.open - min) / span) * 100;
      const yClose = 100 - ((k.close - min) / span) * 100;

      return {
        xCenter,
        yHigh,
        yLow,
        yOpen,
        yClose,
        bullish: k.close >= k.open,
        k,
      };
    });

    return { candles: mapped, minPrice: min, maxPrice: max };
  }, [klines]);

  const up = (changePct ?? 0) >= 0;

  return (
    <section className="mx-auto mb-10 max-w-6xl">
      <div className="rounded-3xl border border-white/12 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.22),transparent_55%),_#020617] px-4 py-4 shadow-[0_0_45px_rgba(0,224,255,0.35)] sm:px-6 sm:py-5">
        {/* Top row: pair & stats */}
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex flex-wrap items-baseline gap-3">
            <div className="text-sm font-semibold text-white">
              {symbol.replace('USDT', '/USDT')}
            </div>
            <div className="text-xs text-white/50">Perpetual Contracts</div>
          </div>

          <div className="flex flex-wrap items-baseline gap-4 text-sm">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">
                Last Price
              </div>
              <div className="text-base font-semibold text-white">
                {lastPrice ? lastPrice.toLocaleString() : '--'}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">
                Change
              </div>
              <div
                className={`text-base font-semibold ${
                  up ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {changePct != null
                  ? `${up ? '+' : ''}${changePct.toFixed(2)}%`
                  : '--'}
              </div>
            </div>
          </div>
        </div>

        {/* Timeframe tabs */}
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-white/40">Time</span>
          {TIMEFRAMES.map((t) => (
            <button
              key={t.label}
              onClick={() => setTf(t)}
              className={`rounded-full px-3 py-1 transition ${
                tf.label === t.label
                  ? 'bg-cyan-500/80 text-black shadow-[0_0_18px_rgba(0,224,255,0.6)]'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Chart area */}
        <div className="relative mt-2 h-56 w-full overflow-hidden rounded-2xl border border-white/6 bg-slate-950/70">
          {error && (
            <div className="flex h-full items-center justify-center text-sm text-rose-300">
              {error}
            </div>
          )}

          {!error && (
            <>
              {(!candles.length || loading) && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-white/50">
                  Loading candlesticks…
                </div>
              )}

              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="h-full w-full"
              >
                {/* grid */}
                <defs>
                  <linearGradient id="candleUp" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                  <linearGradient id="candleDown" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#f97373" />
                    <stop offset="100%" stopColor="#f97373" />
                  </linearGradient>
                </defs>

                <g stroke="rgba(148,163,184,0.18)" strokeWidth="0.2">
                  {[20, 40, 60, 80].map((y) => (
                    <line key={y} x1="0" x2="100" y1={y} y2={y} />
                  ))}
                </g>

                {/* price labels on right */}
                <g
                  fontSize="2.4"
                  fill="rgba(148,163,184,0.8)"
                  textAnchor="end"
                >
                  <text x="98" y="20">
                    {maxPrice ? maxPrice.toFixed(2) : ''}
                  </text>
                  <text x="98" y="60">
                    {minPrice ? minPrice.toFixed(2) : ''}
                  </text>
                </g>

                {/* candles */}
                {candles.map((c, idx) => {
                  const step = 100 / (candles.length || 1);
                  const bodyWidth = step * 0.6;
                  const x = c.xCenter - bodyWidth / 2;
                  const yBodyTop = Math.min(c.yOpen, c.yClose);
                  const bodyHeight = Math.max(
                    Math.abs(c.yClose - c.yOpen),
                    0.8
                  ); // minimum height

                  const strokeColor = c.bullish ? '#22c55e' : '#fb7185';
                  const fill = c.bullish ? 'url(#candleUp)' : 'url(#candleDown)';

                  return (
                    <g key={idx}>
                      {/* wick */}
                      <line
                        x1={c.xCenter}
                        x2={c.xCenter}
                        y1={c.yHigh}
                        y2={c.yLow}
                        stroke={strokeColor}
                        strokeWidth={0.6}
                        strokeLinecap="round"
                      />
                      {/* body */}
                      <rect
                        x={x}
                        y={yBodyTop}
                        width={bodyWidth}
                        height={bodyHeight}
                        fill={fill}
                        stroke={strokeColor}
                        strokeWidth={0.4}
                        rx={0.8}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* small caption */}
              <div className="pointer-events-none absolute left-3 top-2 text-[11px] text-white/50">
                Live Binance candles via /api/kline
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
