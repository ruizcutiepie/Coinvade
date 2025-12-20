// src/app/components/BigMarketsMap.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import CoinIcon from './CoinIcon';

type Interval = '1m' | '5m' | '30m' | '1h' | '1d' | '1w';

type Candle = {
  time: number; // seconds
  open: number;
  high: number;
  low: number;
  close: number;
};

const PAIRS = [
  { label: 'BTC / USDT', symbol: 'BTCUSDT', coin: 'BTC' },
  { label: 'ETH / USDT', symbol: 'ETHUSDT', coin: 'ETH' },
  { label: 'SOL / USDT', symbol: 'SOLUSDT', coin: 'SOL' },
  { label: 'XRP / USDT', symbol: 'XRPUSDT', coin: 'XRP' },
] as const;

const INTERVALS: { label: string; value: Interval }[] = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '30m', value: '30m' },
  { label: '1h', value: '1h' },
  { label: '1d', value: '1d' },
  { label: '1w', value: '1w' },
];

function toNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseKlines(raw: any): Candle[] {
  const arr = Array.isArray(raw) ? raw : raw?.klines || raw?.data || raw?.result;
  if (!Array.isArray(arr)) return [];

  // Binance tuple format: [[openTime, open, high, low, close, ...], ...]
  if (Array.isArray(arr[0])) {
    return arr
      .map((k: any[]) => {
        const openTimeMs = toNum(k[0]);
        const open = toNum(k[1]);
        const high = toNum(k[2]);
        const low = toNum(k[3]);
        const close = toNum(k[4]);
        return { time: Math.floor(openTimeMs / 1000), open, high, low, close };
      })
      .filter((c) => c.time > 0 && c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0);
  }

  // Object format
  return arr
    .map((k: any) => {
      const openTimeMs = toNum(k.openTime ?? k.t ?? k.time ?? 0);
      const open = toNum(k.open);
      const high = toNum(k.high);
      const low = toNum(k.low);
      const close = toNum(k.close);
      return { time: Math.floor(openTimeMs / 1000), open, high, low, close };
    })
    .filter((c) => c.time > 0 && c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0);
}

async function fetchKlines(symbol: string, interval: Interval, limit = 250): Promise<Candle[]> {
  const url = `/api/kline?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(
    interval
  )}&limit=${limit}`;

  const res = await fetch(url, { cache: 'no-store' });
  const txt = await res.text();
  let j: any = null;
  try {
    j = JSON.parse(txt);
  } catch {
    j = txt;
  }

  if (!res.ok) return [];
  const payload = j?.data ?? j?.result ?? j;
  return parseKlines(payload);
}

export default function BigMarketsMap() {
  const [symbol, setSymbol] = useState<string>('BTCUSDT');
  const [interval, setInterval] = useState<Interval>('1m');

  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);

  const lastPrice = useMemo(() => {
    if (!candles.length) return null;
    return candles[candles.length - 1]?.close ?? null;
  }, [candles]);

  // Load data
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const data = await fetchKlines(symbol, interval, 260);
        if (!alive) return;
        setCandles(data);
      } catch (e) {
        console.error('[BigMarketsMap] fetch error', e);
        if (alive) setCandles([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [symbol, interval]);

  // Create chart once (typing-safe via any)
  useEffect(() => {
    let cleanup = () => {};

    (async () => {
      if (!containerRef.current) return;

      const mod: any = await import('lightweight-charts');
      const createChart = mod.createChart;

      containerRef.current.innerHTML = '';

      const chart = createChart(containerRef.current, {
        autoSize: true,
        layout: {
          // ✅ Use simplest background format (avoids "solid" ColorType typing issue)
          background: { color: 'transparent' },
          textColor: 'rgba(255,255,255,0.65)',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        },
        grid: {
          vertLines: { color: 'rgba(255,255,255,0.06)' },
          horzLines: { color: 'rgba(255,255,255,0.06)' },
        },
        rightPriceScale: {
          borderColor: 'rgba(255,255,255,0.10)',
        },
        timeScale: {
          borderColor: 'rgba(255,255,255,0.10)',
          timeVisible: true,
          secondsVisible: interval === '1m' || interval === '5m',
        },
        crosshair: {
          vertLine: { color: 'rgba(34,211,238,0.35)' },
          horzLine: { color: 'rgba(34,211,238,0.35)' },
        },
        handleScroll: true,
        handleScale: true,
      } as any);

      // ✅ Some versions expose addCandlestickSeries, some don’t in typings
      const candleSeries = (chart as any).addCandlestickSeries({
        upColor: 'rgba(34,197,94,0.95)',
        downColor: 'rgba(244,63,94,0.95)',
        borderVisible: false,
        wickUpColor: 'rgba(34,197,94,0.95)',
        wickDownColor: 'rgba(244,63,94,0.95)',
      });

      chartRef.current = chart;
      seriesRef.current = candleSeries;

      cleanup = () => {
        try {
          chart.remove();
        } catch {}
        chartRef.current = null;
        seriesRef.current = null;
      };
    })();

    return () => cleanup();
  }, [interval]);

  // Update series data
  useEffect(() => {
    if (!seriesRef.current) return;

    if (!candles?.length) {
      seriesRef.current.setData([]);
      return;
    }

    seriesRef.current.setData(candles);

    try {
      chartRef.current?.timeScale?.fitContent?.();
    } catch {}
  }, [candles]);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 shadow-[0_0_40px_rgba(0,0,0,.55)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm text-white/70">Time / Pair</div>

          {PAIRS.map((p) => (
            <button
              key={p.symbol}
              onClick={() => setSymbol(p.symbol)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs transition ${
                symbol === p.symbol
                  ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-100 shadow-[0_0_14px_rgba(0,224,255,.35)]'
                  : 'border-white/10 bg-black/40 text-white/70 hover:border-white/30'
              }`}
            >
              <CoinIcon coin={p.coin} size={18} />
              <span>{p.label}</span>
            </button>
          ))}
        </div>

        <div className="text-right">
          <div className="text-xs text-white/60">Last Price</div>
          <div className="text-lg font-semibold text-cyan-200">
            {lastPrice != null ? lastPrice.toLocaleString() : '—'}
          </div>
          <div className="text-xs text-white/50">{loading ? 'Loading…' : '\u00A0'}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="text-sm text-white/60">Time</div>
        {INTERVALS.map((t) => (
          <button
            key={t.value}
            onClick={() => setInterval(t.value)}
            className={`rounded-full border px-4 py-1.5 text-xs transition ${
              interval === t.value
                ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-100'
                : 'border-white/10 bg-black/40 text-white/70 hover:border-white/30'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-3">
        <div className="relative h-[420px] w-full overflow-hidden rounded-xl">
          <div
            ref={containerRef}
            className="h-full w-full"
            style={{
              filter:
                'drop-shadow(0 0 16px rgba(34,211,238,.08)) drop-shadow(0 0 28px rgba(0,0,0,.55))',
            }}
          />

          {!candles.length && !loading && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/50">
              No chart data (check /api/kline).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
