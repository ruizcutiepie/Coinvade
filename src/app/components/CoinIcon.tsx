// src/app/components/CoinIcon.tsx
'use client';

import React from 'react';

type Props = {
  /** preferred prop */
  coin?: string;
  /** optional prop (some pages pass `symbol`) */
  symbol?: string;
  size?: number;
  className?: string;
};

/**
 * Local-rendered icon (no remote fetch) to avoid broken images on Vercel.
 * Accepts either `coin="BTC"` or `symbol="BTCUSDT"`.
 */
export default function CoinIcon({ coin, symbol, size = 18, className }: Props) {
  const raw = (coin || symbol || 'USDT').toUpperCase();

  // If symbol like BTCUSDT, derive BTC
  const c = raw.endsWith('USDT') ? raw.replace('USDT', '') : raw;

  // simple deterministic colors per coin (no external assets)
  const bg =
    c === 'BTC'
      ? '#F7931A'
      : c === 'ETH'
      ? '#627EEA'
      : c === 'SOL'
      ? '#14F195'
      : c === 'XRP'
      ? '#9CA3AF'
      : c === 'ADA'
      ? '#3CC8C8'
      : c === 'BNB'
      ? '#F3BA2F'
      : c === 'DOGE'
      ? '#C2A633'
      : c === 'DOT'
      ? '#E6007A'
      : c === 'USDT'
      ? '#26A17B'
      : '#22d3ee';

  const label = c.length <= 4 ? c : c.slice(0, 4);

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        width: size,
        height: size,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
        boxShadow: '0 0 12px rgba(0,255,255,0.15)',
        flex: '0 0 auto',
      }}
      aria-label={`${c} icon`}
      title={c}
    >
      <span
        style={{
          fontSize: Math.max(9, Math.floor(size * 0.45)),
          fontWeight: 800,
          color: 'rgba(0,0,0,0.85)',
          letterSpacing: '-0.02em',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        {label === 'USDT' ? 'T' : label[0]}
      </span>
    </span>
  );
}
