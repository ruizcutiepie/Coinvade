'use client';

import React from 'react';

type Props = {
  coin: string;
  size?: number;
  className?: string;
};

function letterForCoin(coin: string) {
  const c = (coin || '').toUpperCase();
  if (c === 'BTC') return 'B';
  if (c === 'ETH') return 'E';
  if (c === 'SOL') return 'S';
  if (c === 'XRP') return 'X';
  if (c === 'ADA') return 'A';
  if (c === 'BNB') return 'B';
  if (c === 'DOGE') return 'D';
  if (c === 'DOT') return 'D';
  if (c === 'USDT') return 'U';
  return c.slice(0, 1) || '?';
}

function ringClass(coin: string) {
  // subtle per-coin glow without images
  const c = coin.toUpperCase();
  if (c === 'BTC') return 'ring-amber-400/40 shadow-[0_0_18px_rgba(251,191,36,0.18)]';
  if (c === 'ETH') return 'ring-indigo-400/40 shadow-[0_0_18px_rgba(129,140,248,0.18)]';
  if (c === 'SOL') return 'ring-cyan-400/40 shadow-[0_0_18px_rgba(34,211,238,0.18)]';
  if (c === 'XRP') return 'ring-slate-300/30 shadow-[0_0_18px_rgba(203,213,225,0.12)]';
  if (c === 'ADA') return 'ring-sky-400/40 shadow-[0_0_18px_rgba(56,189,248,0.16)]';
  if (c === 'BNB') return 'ring-yellow-300/40 shadow-[0_0_18px_rgba(253,224,71,0.16)]';
  if (c === 'DOGE') return 'ring-yellow-200/35 shadow-[0_0_18px_rgba(254,240,138,0.14)]';
  if (c === 'DOT') return 'ring-pink-400/40 shadow-[0_0_18px_rgba(244,114,182,0.14)]';
  if (c === 'USDT') return 'ring-emerald-400/40 shadow-[0_0_18px_rgba(52,211,153,0.14)]';
  return 'ring-white/15';
}

export default function CoinIcon({ coin, size = 18, className = '' }: Props) {
  const letter = letterForCoin(coin);
  const ring = ringClass(coin);

  return (
    <span
      className={[
        'inline-flex items-center justify-center rounded-full',
        'bg-white/5 text-white/85 ring-1',
        ring,
        className,
      ].join(' ')}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.floor(size * 0.55)),
        lineHeight: 1,
        fontWeight: 700,
      }}
      aria-label={`${coin} icon`}
      title={coin}
    >
      {letter}
    </span>
  );
}
