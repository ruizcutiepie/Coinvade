'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import CoinIcon from './CoinIcon';

export type TickerCardProps = {
  symbol: string;
  pair?: string;
  coin?: string;
  onClick?: () => void;
};

function fmt(n: number, d = 2) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

function deriveCoin(symbol: string) {
  const up = (symbol || '').toUpperCase();
  if (up.endsWith('USDT')) return up.replace('USDT', '');
  return up.slice(0, 4);
}

export default function TickerCard({ symbol, pair, coin, onClick }: TickerCardProps) {
  const derivedCoin = coin ?? deriveCoin(symbol);
  const derivedPair = pair ?? `${derivedCoin} / USDT`;

  const [price, setPrice] = useState<number | null>(null);
  const [changePct, setChangePct] = useState<number | null>(null);
  const [firstLoad, setFirstLoad] = useState(true);

  const hadValueRef = useRef(false);

  const spark = useMemo(() => {
    const base = price ?? 100;
    return Array.from({ length: 18 }).map((_, i) => {
      const wobble = Math.sin(i / 2) * 0.015 + Math.cos(i / 3) * 0.01;
      return base * (1 + wobble);
    });
  }, [price]);

  useEffect(() => {
    let dead = false;

    async function load() {
      try {
        const res = await fetch(`/api/price?symbol=${encodeURIComponent(symbol)}`, {
          cache: 'no-store',
        });
        const data = await res.json();

        if (dead) return;

        const p =
          Number(data?.price) ||
          Number(data?.lastPrice) ||
          Number(data?.data?.price) ||
          null;

        const cp =
          data?.changePct != null
            ? Number(data.changePct)
            : data?.data?.changePct != null
            ? Number(data.data.changePct)
            : null;

        const nextPrice = Number.isFinite(p as any) ? (p as number) : null;
        const nextPct = Number.isFinite(cp as any) ? (cp as number) : null;

        setPrice((prev) => (prev === nextPrice ? prev : nextPrice));
        setChangePct((prev) => (prev === nextPct ? prev : nextPct));

        if (nextPrice != null) hadValueRef.current = true;
      } catch {
        if (!hadValueRef.current && !dead) {
          setPrice(null);
          setChangePct(null);
        }
      } finally {
        if (!dead && firstLoad) setFirstLoad(false);
      }
    }

    load();
    const t = setInterval(load, 5000);

    return () => {
      dead = true;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  const pctClass =
    changePct == null
      ? 'text-white/60'
      : changePct > 0
      ? 'text-emerald-300'
      : changePct < 0
      ? 'text-rose-300'
      : 'text-white/60';

  const path = useMemo(() => {
    if (!spark.length) return '';
    const w = 220;
    const h = 70;
    const pad = 6;
    const min = Math.min(...spark);
    const max = Math.max(...spark);

    const sx = (i: number) => pad + (i / Math.max(1, spark.length - 1)) * (w - pad * 2);
    const sy = (v: number) => {
      const t = (v - min) / (max - min || 1);
      return h - pad - t * (h - pad * 2);
    };

    return spark
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${sx(i).toFixed(2)} ${sy(v).toFixed(2)}`)
      .join(' ');
  }, [spark]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-3xl border border-white/10 bg-black/45 p-5 text-left shadow-[0_0_30px_rgba(0,255,255,0.08)] transition hover:border-cyan-400/30 hover:bg-black/55"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <CoinIcon coin={derivedCoin} size={22} priority />
          <div className="leading-tight">
            <div className="text-base font-semibold text-white">{derivedPair}</div>
            <div className="text-xs text-white/55">{derivedCoin}</div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-white/50">Last</div>
          <div className="text-base font-semibold text-white tabular-nums">
            {firstLoad && price == null
              ? '…'
              : price != null
              ? fmt(price, price < 10 ? 4 : 2)
              : '—'}
          </div>
          <div className={`text-xs ${pctClass} tabular-nums`}>
            {changePct == null ? '—' : `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`}
          </div>
        </div>
      </div>

      <div className="mt-2 rounded-2xl border border-white/10 bg-black/60 p-3">
        <svg viewBox="0 0 220 70" className="h-[70px] w-full">
          <path d={path} fill="none" stroke="rgba(34,211,238,0.9)" strokeWidth="2" />
          <path d={`${path} L 214 64 L 6 64 Z`} fill="rgba(34,211,238,0.10)" />
        </svg>
      </div>

      <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
        <div className="absolute -inset-x-10 -inset-y-10 bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.18),transparent_55%)]" />
      </div>
    </button>
  );
}
