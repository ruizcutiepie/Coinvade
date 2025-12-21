// src/app/components/CoinIcon.tsx
'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';

type Props = {
  coin: string; // BTC, ETH, etc
  size?: number;
  className?: string;
};

function normalizeCoin(coin: string) {
  return (coin || '').toUpperCase().trim();
}

function coinToLocalSrc(coin: string) {
  // expects these files inside /public
  // e.g. /public/btc.svg
  const c = normalizeCoin(coin).toLowerCase();

  // map any custom aliases if needed
  const map: Record<string, string> = {
    bitcoin: 'btc',
    ethereum: 'eth',
  };

  const file = map[c] ?? c;
  return `/${file}.svg`;
}

function fallbackBg(coin: string) {
  // deterministic-ish class per coin (no external assets)
  const c = normalizeCoin(coin);
  const buckets = [
    'bg-white/10',
    'bg-cyan-500/15',
    'bg-emerald-500/15',
    'bg-rose-500/15',
    'bg-indigo-500/15',
    'bg-amber-500/15',
  ];
  let h = 0;
  for (let i = 0; i < c.length; i++) h = (h * 31 + c.charCodeAt(i)) >>> 0;
  return buckets[h % buckets.length];
}

export default function CoinIcon({ coin, size = 18, className }: Props) {
  const c = normalizeCoin(coin);
  const [imgFailed, setImgFailed] = useState(false);

  const src = useMemo(() => coinToLocalSrc(c), [c]);
  const badge = useMemo(() => {
    if (!c) return '?';
    if (c.length <= 4) return c;
    return c.slice(0, 4);
  }, [c]);

  // If you DON'T have local svg icons, this will gracefully fall back.
  if (imgFailed) {
    return (
      <div
        className={[
          'inline-flex items-center justify-center rounded-full border border-white/15 text-white/90 font-semibold',
          fallbackBg(c),
          className ?? '',
        ].join(' ')}
        style={{ width: size, height: size, fontSize: Math.max(9, size * 0.45) }}
        aria-label={`${c} icon`}
        title={c}
      >
        {badge}
      </div>
    );
  }

  return (
    <span
      className={['inline-flex items-center justify-center', className ?? ''].join(' ')}
      style={{ width: size, height: size }}
      aria-label={`${c} icon`}
      title={c}
    >
      <Image
        src={src}
        alt={`${c} icon`}
        width={size}
        height={size}
        // If the image is missing/broken, we swap to fallback badge
        onError={() => setImgFailed(true)}
        priority={false}
      />
    </span>
  );
}
