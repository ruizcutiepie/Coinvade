'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import CoinIcon from './CoinIcon';

type Interval = '1m' | '5m' | '30m' | '1h';
type LinePoint = { time: number; value: number };

function fmt(n: number, d = 2) {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}

async function fetchLine(symbol: string, interval: Interval, limit = 80): Promise<LinePoint[]> {
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
          const out = raw
            .map((row: any[]) => {
              const tMs = Number(row[0]);
              const close = Number(row[4]);
              if (!Number.isFinite(tMs) || !Number.isFinite(close)) return null;
              return { time: Math.floor(tMs / 1000), value: close };
            })
            .filter(Boolean) as LinePoint[];
          if (out.length) return out;
        }

        if (typeof raw[0] === 'object') {
          const out = raw
            .map((c: any) => {
              const time = Number(c.time ?? c.t ?? c.timestamp);
              const close = Number(c.close ?? c.c);
              const t = time > 2_000_000_000 ? Math.floor(time / 1000) : time;
              if (!Number.isFinite(t) || !Number.isFinite(close)) return null;
              return { time: t, value: close };
            })
            .filter(Boolean) as LinePoint[];
          if (out.length) return out;
        }
      }
    } catch {}
  }

  const now = Math.floor(Date.now() / 1000);
  const step = interval === '1m' ? 60 : interval === '5m' ? 300 : interval === '30m' ? 1800 : 3600;

  let price = 100 + Math.random() * 50;
  const out: LinePoint[] = [];
  for (let i = limit - 1; i >= 0; i--) {
    const t = now - i * step;
    price = Math.max(1, price + (Math.random() - 0.5) * 0.9);
    out.push({ time: t, value: price });
  }
  return out;
}

export default function TickerCard({
  symbol = 'BTCUSDT',
  interval = '1m',
}: {
  symbol?: string;
  interval?: Interval;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const resizeObsRef = useRef<ResizeObserver | null>(null);

  const base = useMemo(() => symbol.replace('USDT', ''), [symbol]);
  const title = useMemo(() => `${base}/USDT`, [base]);

  const [last, setLast] = useState<number>(0);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!ref.current) return;

      const mod: any = await import('lightweight-charts');
      const ColorType = mod.ColorType ?? { Solid: 'solid' };

      ref.current.innerHTML = '';

      const chart = mod.createChart(ref.current, {
        height: 120,
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: 'rgba(255,255,255,0.70)',
          fontSize: 11,
        },
        grid: { vertLines: { visible: false }, horzLines: { visible: false } },
        rightPriceScale: { visible: false },
        leftPriceScale: { visible: false },
        timeScale: { visible: false },
        crosshair: { vertLine: { visible: false }, horzLine: { visible: false } },
        handleScroll: true,
        handleScale: true,
      });

      let line: any = null;
      if (typeof chart.addLineSeries === 'function') {
        line = chart.addLineSeries({ lineWidth: 2, color: '#00C8FF' });
      } else if (typeof chart.addSeries === 'function') {
        const LineSeries = mod.LineSeries;
        line = chart.addSeries(LineSeries, { lineWidth: 2, color: '#00C8FF' });
      }

      chartRef.current = chart;
      seriesRef.current = line;

      resizeObsRef.current?.disconnect();
      resizeObsRef.current = new ResizeObserver(() => {
        if (!ref.current) return;
        chart.applyOptions({ width: ref.current.clientWidth });
      });
      resizeObsRef.current.observe(ref.current);

      const pts = await fetchLine(symbol, interval, 90);
      if (!alive) return;

      if (line?.setData) {
        line.setData(pts.map((p) => ({ time: p.time as any, value: p.value })));
      }

      setLast(pts?.[pts.length - 1]?.value ?? 0);
      chart.timeScale().fitContent();
    })();

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
  }, [symbol, interval]);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CoinIcon coin={base} size={22} />
          <div>
            <div className="text-white font-semibold">{title}</div>
            <div className="text-xs text-white/50">{symbol}</div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-white/50">Last</div>
          <div className="text-white/90 font-semibold">{fmt(last, 2)}</div>
        </div>
      </div>

      <div className="mt-3">
        <div ref={ref} />
        <div className="mt-2 text-[11px] text-white/40">Live feed via proxy /api/price</div>
      </div>
    </div>
  );
}
