'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import CoinIcon from './CoinIcon';

type Interval = '1m' | '5m' | '30m' | '1h' | '1d' | '1w';

type Candle = {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

const PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'] as const;

function fmt(n: number, d = 2) {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}

async function fetchCandles(symbol: string, interval: Interval, limit = 120): Promise<Candle[]> {
  const urls = [
    `/api/kline?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`,
    `/api/price/kline?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`,
    `/api/price/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`,
  ];

  for (const url of urls) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) continue;
      const data = await r.json();
      const raw = (data?.candles ?? data?.data ?? data) as any;

      if (Array.isArray(raw) && raw.length) {
        if (Array.isArray(raw[0])) {
          const out: Candle[] = raw
            .map((row: any[]) => {
              const openTimeMs = Number(row[0]);
              const open = Number(row[1]);
              const high = Number(row[2]);
              const low = Number(row[3]);
              const close = Number(row[4]);
              const volume = row[5] != null ? Number(row[5]) : undefined;
              if (![openTimeMs, open, high, low, close].every(Number.isFinite)) return null;
              return {
                time: Math.floor(openTimeMs / 1000),
                open,
                high,
                low,
                close,
                volume,
              };
            })
            .filter(Boolean) as Candle[];
          if (out.length) return out;
        }

        if (typeof raw[0] === 'object') {
          const out: Candle[] = raw
            .map((c: any) => {
              const time = Number(c.time ?? c.t ?? c.timestamp);
              const open = Number(c.open ?? c.o);
              const high = Number(c.high ?? c.h);
              const low = Number(c.low ?? c.l);
              const close = Number(c.close ?? c.c);
              const volume = c.volume != null ? Number(c.volume ?? c.v) : undefined;
              const t = time > 2_000_000_000 ? Math.floor(time / 1000) : time;
              if (![t, open, high, low, close].every(Number.isFinite)) return null;
              return { time: t, open, high, low, close, volume };
            })
            .filter(Boolean) as Candle[];
          if (out.length) return out;
        }
      }
    } catch {}
  }

  const now = Math.floor(Date.now() / 1000);
  const step =
    interval === '1m'
      ? 60
      : interval === '5m'
      ? 300
      : interval === '30m'
      ? 1800
      : interval === '1h'
      ? 3600
      : interval === '1d'
      ? 86400
      : 604800;

  let price = 100 + Math.random() * 50;
  const out: Candle[] = [];
  for (let i = limit - 1; i >= 0; i--) {
    const t = now - i * step;
    const drift = (Math.random() - 0.5) * 1.2;
    const open = price;
    const close = Math.max(1, price + drift);
    const high = Math.max(open, close) + Math.random() * 0.8;
    const low = Math.min(open, close) - Math.random() * 0.8;
    price = close;
    out.push({ time: t, open, high, low, close });
  }
  return out;
}

export default function BigMarketsMap() {
  const [pair, setPair] = useState<(typeof PAIRS)[number]>('BTCUSDT');
  const [interval, setInterval] = useState<Interval>('1m');
  const [lastPrice, setLastPrice] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const resizeObsRef = useRef<ResizeObserver | null>(null);

  const title = useMemo(() => {
    const base = pair.replace('USDT', '');
    return `${base} / USDT`;
  }, [pair]);

  useEffect(() => {
    let alive = true;

    async function boot() {
      if (!containerRef.current) return;

      const mod: any = await import('lightweight-charts');
      const ColorType = mod.ColorType ?? { Solid: 'solid' };

      containerRef.current.innerHTML = '';

      const chart = mod.createChart(containerRef.current, {
        height: 360,
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: 'rgba(255,255,255,0.75)',
          fontSize: 12,
        },
        grid: {
          vertLines: { color: 'rgba(255,255,255,0.06)' },
          horzLines: { color: 'rgba(255,255,255,0.06)' },
        },
        rightPriceScale: { borderColor: 'rgba(255,255,255,0.10)' },
        timeScale: {
          borderColor: 'rgba(255,255,255,0.10)',
          timeVisible: true,
          secondsVisible: interval === '1m' || interval === '5m',
        },
        crosshair: {
          vertLine: { color: 'rgba(0, 200, 255, 0.25)' },
          horzLine: { color: 'rgba(0, 200, 255, 0.25)' },
        },
        handleScroll: true,
        handleScale: true,
      });

      let candles: any;
      if (typeof chart.addCandlestickSeries === 'function') {
        candles = chart.addCandlestickSeries({
          upColor: '#00E5A8',
          downColor: '#FF5B7A',
          wickUpColor: '#00E5A8',
          wickDownColor: '#FF5B7A',
          borderVisible: false,
        });
      } else if (typeof chart.addSeries === 'function') {
        const CandlestickSeries = mod.CandlestickSeries;
        candles = chart.addSeries(CandlestickSeries, {
          upColor: '#00E5A8',
          downColor: '#FF5B7A',
          wickUpColor: '#00E5A8',
          wickDownColor: '#FF5B7A',
          borderVisible: false,
        });
      } else {
        candles = null;
      }

      chartRef.current = chart;
      seriesRef.current = candles;

      resizeObsRef.current?.disconnect();
      resizeObsRef.current = new ResizeObserver(() => {
        if (!containerRef.current) return;
        chart.applyOptions({ width: containerRef.current.clientWidth });
      });
      resizeObsRef.current.observe(containerRef.current);

      const data = await fetchCandles(pair, interval, 140);
      if (!alive) return;

      if (candles?.setData) {
        candles.setData(
          data.map((c) => ({
            time: c.time as any,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }))
        );
      }

      setLastPrice(data?.[data.length - 1]?.close ?? 0);
      chart.timeScale().fitContent();
    }

    boot();

    return () => {
      alive = false;
      resizeObsRef.current?.disconnect();
      resizeObsRef.current = null;
      try {
        chartRef.current?.remove?.();
      } catch {}
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [pair, interval]);

  const coin = pair.replace('USDT', '');

  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-5 shadow-[0_0_60px_rgba(0,200,255,0.12)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="text-white/70">Time / Pair</div>

          <div className="flex flex-wrap gap-2">
            {PAIRS.map((p) => {
              const active = p === pair;
              const label = `${p.replace('USDT', '')} / USDT`;
              return (
                <button
                  key={p}
                  onClick={() => setPair(p)}
                  className={[
                    'rounded-full px-4 py-2 text-sm transition',
                    active
                      ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40'
                      : 'bg-white/5 text-white/70 hover:bg-white/10',
                  ].join(' ')}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-right">
          <div className="text-white/60 text-sm">Last Price</div>
          <div className="text-cyan-200 text-2xl font-semibold">{fmt(lastPrice, 2)}</div>
          <div className="text-white/50 text-xs">+0.00%</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="text-white/60 text-sm mr-2">Time</div>
        {(['1m', '5m', '30m', '1h', '1d', '1w'] as Interval[]).map((t) => {
          const active = t === interval;
          return (
            <button
              key={t}
              onClick={() => setInterval(t)}
              className={[
                'rounded-full px-3 py-1.5 text-xs transition',
                active
                  ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40'
                  : 'bg-white/5 text-white/70 hover:bg-white/10',
              ].join(' ')}
            >
              {t}
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-3">
        <div className="flex items-center justify-between px-2 pb-3">
          <div className="flex items-center gap-2">
            <CoinIcon coin={coin} size={22} />
            <div className="text-white font-semibold">{title}</div>
          </div>
          <div className="text-xs text-white/50">Zoom with mouse wheel / pinch</div>
        </div>

        <div ref={containerRef} className="w-full" />
      </div>
    </div>
  );
}
