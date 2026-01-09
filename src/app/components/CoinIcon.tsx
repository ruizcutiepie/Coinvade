// src/app/components/CoinIcon.tsx
'use client';

import React, { memo } from 'react';
import Image from 'next/image';

type Props = {
  coin: string;
  size?: number;
  className?: string;
  priority?: boolean;
};

type KnownCoin =
  | 'BTC'
  | 'ETH'
  | 'SOL'
  | 'XRP'
  | 'ADA'
  | 'BNB'
  | 'DOGE'
  | 'DOT'
  | 'USDT'
  | 'USDC';

const COIN_IMG: Partial<Record<KnownCoin, string>> = {
  BTC: '/coins/btc.png',
  ETH: '/coins/eth.png',
  SOL: '/coins/sol.png',
  XRP: '/coins/xrp.png',
  ADA: '/coins/ada.png',
  BNB: '/coins/bnb.png',
  DOGE: '/coins/doge.png',
  DOT: '/coins/dot.png',
  USDT: '/coins/usdt.png',
  USDC: '/coins/usdc.png',
};

function CoinIconBase({ coin, size = 18, className, priority = false }: Props) {
  const key = (coin || '').toUpperCase() as KnownCoin;
  const src = COIN_IMG[key];

  // Fallback to a non-flickery letter badge if unknown or missing image.
  if (!src) {
    const letter = (key?.charAt(0) || '?').toUpperCase();
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

  return (
    <span
      className={['inline-flex items-center justify-center', className || ''].join(' ')}
      style={{ width: size, height: size }}
      aria-label={`${key} icon`}
      title={key}
    >
      <Image
        src={src}
        alt={`${key} icon`}
        width={size}
        height={size}
        priority={priority}
        draggable={false}
        className="select-none"
      />
    </span>
  );
}

export default memo(CoinIconBase);
