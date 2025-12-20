// src/app/components/TickerCard.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import CoinIcon from './CoinIcon';

type Interval = '1m' | '5m' | '30m' | '1h';
type LinePoint = { time: number; value: number };

function toNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseToLinePoints(raw: any): LinePoint[] {
  const arr = Array.isArray(raw) ? raw : raw?.klines || raw?.data || raw?.result;
  if (!Array.isArray(arr)) return [];

  if (Array.isArray(arr[0])) {
    return arr
      .map((k: any[]) => ({ time: Math.floor(toNum(k[0]) / 1000), value: toNum(k[4]) }))
      .filter((p) => p.time > 0 && p.value > 0);
  }

  return arr
    .map((k: any) => ({
      time: Math.floor(toNum(k.openTime ?? k.t ?? k.time ?? 0) / 1000),
      value: toNum(k.close),
    }))
    .filter((p) => p.time > 0 && p.value > 0);
}

async function fetchSpark(symbol: string, interval: Interval, limit = 120): Promise<LinePoint[]> {
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
  return parseToLinePoints(payload);
}

export default function TickerCard({
  symbol,
  interval = '1m',
}: {
  symbol: string; // e.g. BTCUSDT
  interval?: Interval;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);

  const [points, setPoints] = useState<LinePoint[]>([]);
  const [loading, setLoading] = useState(false);

  const coin = useMemo(() => symbol.replace('USDT', '').toUpperCase(), [symbol]);

  const last = useMemo(() => {
    if (!points.length) return null;
    return points[points.length - 1]?.value ?? null;
  }, [points]);

  // Fetch initial + refresh
  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setLoading(true);
        const p = await fetchSpark(symbol, interval, 120);
        if (!alive) return;
        setPoints(p);
      } catch (e) {
        console.error('[TickerCard] fetch error', e);
        if (alive) setPoints([]);
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    const t = setInterval(load, 5000);

    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [symbol, interval]);

  // Create chart once (typing-safe via any)
  useEffect(() => {
    let cleanup = () => {};

    (async () => {
      if (!ref.current) return;

      const mod: any = await import('lightweight-charts');
      const createChart = mod.createChart;

      ref.current.innerHTML = '';

      const chart = createChart(ref.current, {
        autoSize: true,
        layout: {
          background: { color: 'transparent' },
          textColor: 'rgba(255,255,255,0.55)',
        },
        grid: {
          vertLines: { color: 'rgba(255,255,255,0.05)' },
          horzLines: { color: 'rgba(255,255,255,0.05)' },
        },
        rightPriceScale: { visible: false },
        leftPriceScale: { visible: false },
        timeScale: { visible: false },
        crosshair: { mode: 0 },
        handleScroll: true,
        handleScale: true,
      } as any);

      // ✅ Use any: fixes “addAreaSeries does not exist” typing mismatch
      const series = (chart as any).addAreaSeries({
        lineColor: 'rgba(34,211,238,0.95)',
        topColor: 'rgba(34,211,238,0.25)',
        bottomColor: 'rgba(34,211,238,0.02)',
        lineWidth: 2,
      });

      chartRef.current = chart;
      seriesRef.current = series;

      cleanup = () => {
        try {
          chart.remove();
        } catch {}
        chartRef.current = null;
        seriesRef.current = null;
      };
    })();

    return () => cleanup();
  }, []);

  // Update data
  useEffect(() => {
    if (!seriesRef.current) return;
    seriesRef.current.setData(points);
    try {
      chartRef.current?.timeScale?.fitContent?.();
    } catch {}
  }, [points]);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <CoinIcon coin={coin} size={28} />
          <div>
            <div className="text-lg font-semibold text-white/90">{coin}/USDT</div>
            <div className="text-[11px] text-white/50">{symbol}</div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-white/60">Last Price</div>
          <div className="text-xl font-semibold text-cyan-200">
            {last != null ? last.toLocaleString() : '—'}
          </div>
          <div className="text-[11px] text-white/50">{loading ? 'Updating…' : '\u00A0'}</div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-black/40 p-3">
        <div
          ref={ref}
          className="h-[140px] w-full"
          style={{ filter: 'drop-shadow(0 0 14px rgba(34,211,238,.10))' }}
        />
        {!points.length && !loading && (
          <div className="mt-2 text-xs text-white/40">No sparkline data (check /api/kline).</div>
        )}
      </div>

      <div className="mt-2 text-[11px] text-white/40">
        Live feed via <span className="text-white/60">/api/kline</span>
      </div>
    </div>
  );
}
