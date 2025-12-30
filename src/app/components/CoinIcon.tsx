'use client';

import React from 'react';

type Props = {
  coin: string;
  size?: number;
  className?: string;
};

const LETTERS: Record<string, string> = {
  BTC: 'B',
  ETH: 'E',
  SOL: 'S',
  XRP: 'X',
  ADA: 'A',
  BNB: 'B',
  DOGE: 'D',
  DOT: 'D',
  USDT: 'U',
};

export default function CoinIcon({ coin, size = 18, className }: Props) {
  const key = (coin || '').toUpperCase();
  const letter = LETTERS[key] ?? key.charAt(0) ?? '?';

  return (
    <span
      className={[
        'inline-flex items-center justify-center rounded-full',
        'border border-white/20 bg-black/50 text-white/90',
        'shadow-[0_0_18px_rgba(0,255,255,0.10)] select-none',
        className || '',
      ].join(' ')}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.floor(size * 0.55)),
        lineHeight: 1,
        fontWeight: 800,
      }}
      aria-label={`${key} icon`}
      title={key}
    >
      {letter}
    </span>
  );
}
