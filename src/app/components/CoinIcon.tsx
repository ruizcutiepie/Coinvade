// src/app/components/CoinIcon.tsx
'use client';

import React from 'react';
import Image from 'next/image';

type Props = {
  coin: string; // "BTC"
  size?: number;
  className?: string;
};

const MAP: Record<string, string> = {
  BTC: '/coins/btc.svg',
  ETH: '/coins/eth.svg',
  SOL: '/coins/sol.svg',
  XRP: '/coins/xrp.svg',
  ADA: '/coins/ada.svg',
  BNB: '/coins/bnb.svg',
  DOGE: '/coins/doge.svg',
  DOT: '/coins/dot.svg',
  USDT: '/coins/usdt.svg',
};

export default function CoinIcon({ coin, size = 18, className }: Props) {
  const key = String(coin || '').toUpperCase();
  const src = MAP[key];

  if (!src) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 text-[10px] text-white/70 ${className ?? ''}`}
        style={{ width: size, height: size }}
        title={key}
      >
        {key.slice(0, 2)}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={key}
      width={size}
      height={size}
      className={className}
      priority={false}
    />
  );
}
