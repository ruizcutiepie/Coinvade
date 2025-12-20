// src/app/components/TickerCard.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import CoinIcon from './CoinIcon';

type Interval = '1m' | '5m' | '30m' | '1h' | '1d' | '1w';
type LinePoint = { time: number; value: number };

export type TickerCardProps = {
  symbol: string;        // e.g. "BTCUSDT"
  pair?: string;         // optional now
  coin?: string;         // optional now
  label?: string;
  interval?: Interval;
};

function fmt(n: number, d = 2) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

function deriveFromSymbol(symbol: string) {
  const s = String(symbol || '').toUpperCase().trim();

  // Common quote assets
  const QUOTES = ['USDT', 'USD', 'BUSD', 'USDC', 'BTC', 'ETH'];

  for (const q of QUOTES) {
    if (s.endsWith(q) && s.length > q.length) {
      const base = s.slice(0, -q.length);
      return { base, quote: q, pair: `${base} / ${q}` };
    }
  }

  // Fallback: try split last 3 or 4
  if (s.length >= 6) {
    const quote3 = s.slice(-3);
    const base3 = s.slice(0, -3);
    return { base: base3, quote: quote3, pair: `${base3} / ${quote3}` };
  }

  return { base: s, quote: '', pair: s };
}

export default function TickerCard({
  symbol,
  pair,
  coin,
  label,
  interval = '1m',
}: TickerCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [last, setLast] = useState<number | null>(null);
  const [chg, setChg] = useState<number>(0);

  const derived = useMemo(() => deriveFromSymbol(symbol), [symbol]);
  const displayPair = pair ?? derived.pair;
  const displayCoin = (coin ?? derived.base ?? '').toUpperCase();
  const title = useMemo(() => label ?? displayPair, [label, displayPair]);

  useEffect(() => {
    let chart: any = null;
    let series: any = null;
    let alive = true;

    async function boot() {
      if (!ref.current) return;

      // IMPORTANT: requires `npm i lightweight-charts`
      const mod: any = await import('lightweight-charts');
      if (!alive) return;

      ref.current.innerHTML = '';

      chart = mod.createChart(ref.current, {
        height: 76,
        layout: {
          background: { type: 'solid', color: 'transparent' },
          textColor: 'rgba(255,255,255,0.75)',
        },
        grid: {
          vertLines: { color: 'rgba(255,255,255,0.06)' },
          horzLines: { color: 'rgba(255,255,255,0.06)' },
        },
        rightPriceScale: { visible: false },
        leftPriceScale: { visible: false },
        timeScale: { visible: false, borderVisible: false },
        crosshair: {
          vertLine: { visible: false },
          horzLine: { visible: false },
        },
        handleScroll: false,
        handleScale: false,
      });

      series = chart.addLineSeries({
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        color: 'rgba(34,211,238,0.95)',
      });

      const res = await fetch(`/api/kline?symbol=${symbol}&interval=${interval}`, {
        cache: 'no-store',
      });
      const data = await res.json();

      const klines = (data?.klines ?? []) as any[];
      const pts: LinePoint[] = klines.map((k) => ({
        time: Math.floor((k.openTime ?? 0) / 1000),
        value: Number(k.close ?? 0),
      }));

      if (!alive) return;

      series.setData(pts);

      const l = pts[pts.length - 1]?.value ?? null;
      const p = pts[pts.length - 2]?.value ?? null;

      setLast(l);
      setChg(l != null && p ? ((l - p) / p) * 100 : 0);

      const ro = new ResizeObserver(() => {
        if (!ref.current || !chart) return;
        chart.applyOptions({ width: ref.current.clientWidth });
      });
      ro.observe(ref.current);

      return () => ro.disconnect();
    }

    boot();

    return () => {
      alive = false;
      try {
        chart?.remove();
      } catch {}
    };
  }, [symbol, interval]);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/35 p-4 shadow-[0_0_28px_rgba(0,255,255,0.08)] transition hover:border-cyan-400/35 hover:bg-black/45">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CoinIcon coin={displayCoin} size={20} className="opacity-95" />
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white/90">{displayPair}</div>
            <div className="text-[11px] text-white/45">{title}</div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm font-semibold text-white/90">
            {last == null ? '—' : fmt(last)}
          </div>
          <div
            className={`text-[11px] ${
              chg > 0
                ? 'text-emerald-300'
                : chg < 0
                ? 'text-rose-300'
                : 'text-white/45'
            }`}
          >
            {last == null ? '—' : `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%`}
          </div>
        </div>
      </div>

      <div className="relative">
        <div
          className="pointer-events-none absolute -inset-2 opacity-0 blur-2xl transition group-hover:opacity-100"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(34,211,238,0.18), transparent 60%)',
          }}
        />
        <div ref={ref} className="h-[76px] w-full" />
      </div>
    </div>
  );
}
