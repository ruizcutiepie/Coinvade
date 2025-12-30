// src/app/components/CoinIcon.tsx
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

function getLetter(coin: string) {
  // Match your request: B for BTC, E for ETH, etc.
  if (!coin) return '?';
  return coin[0]?.toUpperCase() ?? '?';
}

function ringColor(coin: string) {
  switch (coin.toUpperCase()) {
    case 'BTC':
      return 'border-amber-400/50 text-amber-200';
    case 'ETH':
      return 'border-indigo-400/50 text-indigo-200';
    case 'SOL':
      return 'border-cyan-400/50 text-cyan-200';
    case 'XRP':
      return 'border-slate-400/50 text-slate-200';
    case 'ADA':
      return 'border-blue-400/50 text-blue-200';
    case 'BNB':
      return 'border-yellow-400/50 text-yellow-200';
    case 'DOGE':
      return 'border-orange-400/50 text-orange-200';
    case 'DOT':
      return 'border-pink-400/50 text-pink-200';
    case 'USDT':
      return 'border-emerald-400/50 text-emerald-200';
    default:
      return 'border-white/20 text-white/80';
  }
}

export default function CoinIcon({ coin, size = 18, className }: Props) {
  const letter = getLetter(String(coin));
  const colors = ringColor(String(coin));

  return (
    <span
      aria-hidden="true"
      className={[
        'inline-flex items-center justify-center rounded-full',
        'bg-black/40 border',
        'shadow-[0_0_14px_rgba(0,255,255,0.10)]',
        colors,
        className ?? '',
      ].join(' ')}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.round(size * 0.55)),
        lineHeight: 1,
        fontWeight: 700,
      }}
      title={String(coin).toUpperCase()}
    >
      {letter}
    </span>
  );
}
