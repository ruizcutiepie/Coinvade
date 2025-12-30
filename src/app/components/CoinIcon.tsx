// src/app/components/CoinIcon.tsx
'use client';

import React from 'react';

type Props = {
  coin: string; // e.g. BTC, ETH, SOL, XRP, ADA, BNB, DOGE, DOT, USDT
  size?: number;
  className?: string;
};

function firstLetter(coin: string) {
  const c = (coin || '').trim().toUpperCase();
  if (!c) return '?';
  // special-case USDT if you want "U" (default is U anyway)
  return c[0];
}

// Optional: subtle per-coin ring color (NO images, no network)
function ringClass(coin: string) {
  const c = coin.toUpperCase();
  if (c === 'BTC') return 'ring-amber-400/60 text-amber-200';
  if (c === 'ETH') return 'ring-indigo-400/60 text-indigo-200';
  if (c === 'SOL') return 'ring-cyan-400/60 text-cyan-200';
  if (c === 'XRP') return 'ring-slate-300/50 text-slate-100';
  if (c === 'ADA') return 'ring-sky-400/60 text-sky-200';
  if (c === 'BNB') return 'ring-yellow-400/60 text-yellow-200';
  if (c === 'DOGE') return 'ring-orange-300/60 text-orange-200';
  if (c === 'DOT') return 'ring-pink-400/60 text-pink-200';
  if (c === 'USDT') return 'ring-emerald-400/60 text-emerald-200';
  return 'ring-white/20 text-white/90';
}

export default function CoinIcon({ coin, size = 18, className }: Props) {
  const letter = firstLetter(coin);
  const ring = ringClass(coin);

  return (
    <span
      className={[
        'inline-flex items-center justify-center rounded-full',
        'bg-black/40 ring-1',
        ring,
        'select-none',
        className ?? '',
      ].join(' ')}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.floor(size * 0.55)),
        lineHeight: 1,
      }}
      aria-label={coin}
      title={coin}
    >
      <span className="font-semibold">{letter}</span>
    </span>
  );
}
