// src/app/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import BigMarketsMap from './components/BigMarketsMap';
import {
  useLang,
  LANG_OPTIONS,
  tr,
  type LangCode,
} from './components/useLang';

// DB-backed wallet balance component
import WalletBalance from './components/WalletBalance';

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

function fmt(n: number, d = 2) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

/* -------------------------------------------------------
   HERO KLINE PANEL (Chart with Neon Gridlines)
-------------------------------------------------------- */

const HERO_SYMBOLS = [
  { label: 'BTC / USDT', value: 'BTCUSDT' },
  { label: 'ETH / USDT', value: 'ETHUSDT' },
  { label: 'SOL / USDT', value: 'SOLUSDT' },
  { label: 'XRP / USDT', value: 'XRPUSDT' },
];

const HERO_INTERVALS = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '30m', value: '30m' },
  { label: '1h', value: '1h' },
  { label: '1d', value: '1d' },
  { label: '1w', value: '1w' },
];

function HeroKlinePanel({ lang }: { lang: LangCode }) {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState('1m');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/kline?symbol=${symbol}&interval=${interval}`,
          { cache: 'no-store' }
        );
        const data = await res.json();
        if (!res.ok || data?.error) {
          throw new Error(data?.message || data?.detail || 'Kline error');
        }
        if (cancelled) return;

        const klines: Candle[] = (data.klines || []).map((k: any) => ({
          time: k.openTime,
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close,
          volume: k.volume ?? 0,
        }));

        setCandles(klines);
      } catch {
        if (!cancelled) {
          setError('Network error');
          setCandles([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [symbol, interval]);

  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const lastPrice = last?.close ?? null;

  const changePct =
    last && prev && prev.close
      ? ((last.close - prev.close) / prev.close) * 100
      : 0;

  const bounds = useMemo(() => {
    if (!candles.length) return { min: 0, max: 1 };
    let min = candles[0].low;
    let max = candles[0].high;
    for (const c of candles) {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
    }
    const pad = (max - min) * 0.05 || 1;
    return { min: min - pad, max: max + pad };
  }, [candles]);

  const maxVolume = useMemo(() => {
    if (!candles.length) return 1;
    return candles.reduce((m, c) => (c.volume > m ? c.volume : m), 0);
  }, [candles]);

  const width = 900;
  const height = 260;
  const paddingX = 40;
  const paddingTop = 30;
  const paddingBottom = 30;
  const volumeAreaHeight = 55;

  const priceAreaBottom = height - paddingBottom - volumeAreaHeight;
  const priceAreaTop = paddingTop;

  const yPrice = (p: number) => {
    const t = (p - bounds.min) / (bounds.max - bounds.min || 1);
    return priceAreaBottom - t * (priceAreaBottom - priceAreaTop);
  };

  const yVolume = (v: number) => {
    const t = v / maxVolume;
    const top = height - paddingBottom - volumeAreaHeight;
    const bottom = height - paddingBottom;
    return bottom - t * (bottom - top);
  };

  const candleWidth =
    candles.length > 0
      ? ((width - paddingX * 2) / candles.length) * 0.6
      : 4;

  const handleMove = (e: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - paddingX;
    const usable = width - paddingX * 2;

    if (x < 0 || x > usable) {
      setHoverIndex(null);
      return;
    }

    const idx = Math.round((x / usable) * (candles.length - 1));
    setHoverIndex(idx);
  };

  const hoverC = hoverIndex != null ? candles[hoverIndex] : null;

  // TRANSLATION FALLBACKS
  const tHeroTime = tr('hero.time', lang);
  const tHeroLastPrice = tr('hero.lastPrice', lang);
  const labelHeroTime = tHeroTime === 'hero.time' ? 'Time' : tHeroTime;
  const labelHeroLastPrice =
    tHeroLastPrice === 'hero.lastPrice' ? 'Last Price' : tHeroLastPrice;

  return (
    <section className="mx-auto mb-12 max-w-6xl">
      <div className="rounded-3xl border border-cyan-500/25 bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-black/95 p-5 shadow-[0_0_40px_rgba(0,255,255,0.18)]">

        {/* HEADER */}
        <div className="mb-4 flex justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-sm text-white/60">
              {labelHeroTime} / Pair
            </div>

            {HERO_SYMBOLS.map((s) => (
              <button
                key={s.value}
                onClick={() => setSymbol(s.value)}
                className={`rounded-full px-4 py-1.5 text-sm ${
                  symbol === s.value
                    ? 'bg-cyan-500 text-black shadow-[0_0_18px_rgba(0,255,255,.5)]'
                    : 'border border-white/10 bg-white/5 text-white/80'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* LAST PRICE */}
          <div className="flex flex-col items-end text-sm">
            <div className="text-white/60">{labelHeroLastPrice}</div>
            <div className="text-lg font-semibold text-cyan-200">
              {lastPrice ? fmt(lastPrice) : '--'}
            </div>
            <div
              className={`text-xs ${
                changePct > 0
                  ? 'text-emerald-300'
                  : changePct < 0
                  ? 'text-rose-300'
                  : 'text-white/50'
              }`}
            >
              {lastPrice
                ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`
                : '--'}
            </div>
          </div>
        </div>

        {/* INTERVAL BUTTONS */}
        <div className="mb-3 flex gap-2 text-xs">
          <span className="text-white/60">{labelHeroTime}</span>
          {HERO_INTERVALS.map((i) => (
            <button
              key={i.value}
              onClick={() => setInterval(i.value)}
              className={`rounded-full px-3 py-1 ${
                interval === i.value
                  ? 'bg-cyan-500 text-black'
                  : 'border border-white/10 bg-white/5 text-white/75'
              }`}
            >
              {i.label}
            </button>
          ))}
        </div>

        {/* CHART */}
        <div className="relative mt-2 rounded-2xl border border-white/5 bg-black/70 px-3 py-3">

          {/* HOVER DETAILS */}
          {hoverC && (
            <div className="absolute left-3 top-2 text-xs text-white/70">
              O: <span className="text-cyan-200">{fmt(hoverC.open)}</span>{' '}
              H: <span className="text-cyan-200">{fmt(hoverC.high)}</span>{' '}
              L: <span className="text-cyan-200">{fmt(hoverC.low)}</span>{' '}
              C:{' '}
              <span
                className={
                  hoverC.close >= hoverC.open
                    ? 'text-emerald-300'
                    : 'text-rose-300'
                }
              >
                {fmt(hoverC.close)}
              </span>
            </div>
          )}

          {/* SVG GRAPH */}
          <svg
            width="100%"
            viewBox={`0 0 ${width} ${height}`}
            onMouseMove={handleMove}
            onMouseLeave={() => setHoverIndex(null)}
          >
            {/* ⭐ NEON GRID ⭐ */}
            <defs>
              <pattern
                id="hero-grid"
                width="50"
                height="30"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 50 0 L 0 0 0 30"
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth="0.8"
                />
              </pattern>
            </defs>

            <rect
              x={paddingX}
              y={paddingTop}
              width={width - paddingX * 2}
              height={height - paddingTop - paddingBottom}
              fill="url(#hero-grid)"
            />

            {/* CANDLES */}
            {candles.map((c, idx) => {
              const x =
                paddingX +
                (idx / Math.max(1, candles.length - 1)) *
                  (width - paddingX * 2);

              const isUp = c.close >= c.open;
              const color = isUp ? '#22c55e' : '#fb7185';

              return (
                <g key={c.time}>
                  <line
                    x1={x}
                    x2={x}
                    y1={yPrice(c.high)}
                    y2={yPrice(c.low)}
                    stroke={color}
                  />
                  <rect
                    x={x - candleWidth / 2}
                    y={Math.min(yPrice(c.open), yPrice(c.close))}
                    width={candleWidth}
                    height={Math.abs(yPrice(c.open) - yPrice(c.close)) || 2}
                    fill={color}
                    rx={1}
                  />
                </g>
              );
            })}

            {/* VOLUME */}
            {candles.map((c, idx) => {
              const x =
                paddingX +
                (idx / Math.max(1, candles.length - 1)) *
                  (width - paddingX * 2);

              const color = c.close >= c.open
                ? 'rgba(34,197,94,0.55)'
                : 'rgba(248,113,113,0.55)';

              const barW = candleWidth * 0.5;
              const yTop = yVolume(c.volume);

              return (
                <rect
                  key={`vol-${c.time}`}
                  x={x - barW / 2}
                  y={yTop}
                  width={barW}
                  height={height - paddingBottom - yTop}
                  fill={color}
                  rx={1}
                />
              );
            })}
          </svg>

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/50">
              Loading…
            </div>
          )}

          {error && !loading && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-rose-300">
              {error}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------
   MAIN HOME PAGE
-------------------------------------------------------- */

export default function Home() {
  const { lang, setLang } = useLang();
  const currentLang =
    LANG_OPTIONS.find((l) => l.code === lang) ?? LANG_OPTIONS[0];

  return (
    <main className="min-h-screen px-6 pb-16 pt-6 text-white">

      {/* TOP BAR */}
      <div className="mb-8 flex justify-between items-center">
        <div className="text-lg tracking-wide text-[var(--neon)]">COINVADE</div>

        <div className="flex items-center gap-3">

          {/* DESKTOP LANGUAGE SELECTOR */}
          <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white/70">
            <span className="text-lg">{currentLang.flag}</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as LangCode)}
              className="bg-transparent text-xs outline-none"
            >
              {LANG_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.flag} {opt.name}
                </option>
              ))}
            </select>
          </div>

          {/* DB WALLET BALANCE */}
          <WalletBalance />
        </div>
      </div>

      {/* MOBILE LANGUAGE SELECTOR */}
      <div className="fixed bottom-4 left-4 z-40 flex sm:hidden items-center gap-2 rounded-full border border-white/20 bg-black/70 px-3 py-2 text-xs text-white/80 shadow-lg">
        <span>{currentLang.flag}</span>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as LangCode)}
          className="bg-transparent outline-none text-xs"
        >
          {LANG_OPTIONS.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.flag} {opt.name}
            </option>
          ))}
        </select>
      </div>

      {/* NAVIGATION */}
      <div className="mb-8 flex justify-center gap-8 text-white/80">
        <Nav to="#" label={tr('nav.verify', lang)} />
        <Nav to="/" label={tr('nav.markets', lang)} />
        <Nav to="/wallet" label={tr('nav.wallet', lang)} />
        <Nav to="/trade" label={tr('nav.trade', lang)} />
      </div>

      {/* HERO CHART */}
      <HeroKlinePanel lang={lang} />

      {/* HEADINGS */}
      <h1 className="mx-auto mb-2 max-w-5xl text-center text-4xl font-extrabold text-white sm:text-5xl">
        {tr('markets.heading', lang)}
      </h1>
      <p className="mb-10 text-center text-sm text-white/60">
        {tr('markets.sub', lang)}
      </p>

      {/* MARKET OVERVIEW */}
      <section className="mx-auto max-w-6xl">
        <BigMarketsMap />
      </section>
    </main>
  );
}

/* -------------------------------------------------------
   NAV COMPONENT
-------------------------------------------------------- */

function Nav({ to, label }: { to: string; label: string }) {
  const inner = (
    <span className="inline-block rounded-xl border border-white/10 px-3 py-1 text-white/80 hover:text-white">
      {label}
    </span>
  );

  return to.startsWith('/') ? (
    <Link href={to}>{inner}</Link>
  ) : (
    <a href={to}>{inner}</a>
  );
}
