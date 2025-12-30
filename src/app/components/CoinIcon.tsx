'use client';

import React from 'react';

type Coin =
  | 'BTC'
  | 'ETH'
  | 'SOL'
  | 'XRP'
  | 'ADA'
  | 'BNB'
  | 'DOGE'
  | 'DOT'
  | 'USDT';

type Props = {
  coin: Coin | string;
  size?: number;
  className?: string;
};

function pickLetter(coin: string) {
  const c = (coin || '').toUpperCase();
  if (!c) return '?';
  // Use first character by default
  return c[0];
}

function ringColor(coin: string) {
  const c = (coin || '').toUpperCase();
  // subtle variety, still “on brand”
  if (c === 'BTC') return 'border-amber-400/70 text-amber-200';
  if (c === 'ETH') return 'border-slate-300/60 text-slate-100';
  if (c === 'SOL') return 'border-fuchsia-300/60 text-fuchsia-200';
  if (c === 'XRP') return 'border-sky-300/60 text-sky-200';
  if (c === 'ADA') return 'border-indigo-300/60 text-indigo-200';
  if (c === 'BNB') return 'border-yellow-300/60 text-yellow-200';
  if (c === 'DOGE') return 'border-orange-300/60 text-orange-200';
  if (c === 'DOT') return 'border-pink-300/60 text-pink-200';
  if (c === 'USDT') return 'border-emerald-300/60 text-emerald-200';
  return 'border-white/25 text-white/80';
}

export default function CoinIcon({ coin, size = 18, className }: Props) {
  const letter = pickLetter(String(coin));
  const colors = ringColor(String(coin));

  return (
    <span
      className={[
        'inline-flex items-center justify-center rounded-full',
        'bg-black/40 border',
        'shadow-[0_0_18px_rgba(0,255,255,0.08)]',
        'select-none',
        colors,
        className || '',
      ].join(' ')}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.floor(size * 0.55)),
        lineHeight: 1,
        fontWeight: 700,
      }}
      aria-label={`${coin} icon`}
      title={String(coin).toUpperCase()}
    >
      {letter}
    </span>
  );
}
