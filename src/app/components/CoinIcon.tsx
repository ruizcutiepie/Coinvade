'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';

type Props = {
  coin: string; // "BTC", "ETH", etc.
  size?: number;
  className?: string;
};

// Put your SVGs/PNGs here: /public/coins/btc.svg, /public/coins/eth.svg, ...
function coinToSrc(coin: string) {
  const c = (coin || '').trim().toLowerCase();

  // normalize common variants
  if (c === 'usdt') return '/coins/usdt.svg';
  if (c === 'btc') return '/coins/btc.svg';
  if (c === 'eth') return '/coins/eth.svg';
  if (c === 'sol') return '/coins/sol.svg';
  if (c === 'xrp') return '/coins/xrp.svg';
  if (c === 'ada') return '/coins/ada.svg';
  if (c === 'bnb') return '/coins/bnb.svg';
  if (c === 'doge') return '/coins/doge.svg';
  if (c === 'dot') return '/coins/dot.svg';

  // fallback guess (if you add more later)
  return `/coins/${c}.svg`;
}

export default function CoinIcon({ coin, size = 18, className }: Props) {
  const [failed, setFailed] = useState(false);

  const src = useMemo(() => coinToSrc(coin), [coin]);

  // Nice fallback initials (never broken)
  const initials = (coin || '?').toUpperCase().slice(0, 2);

  if (failed) {
    return (
      <span
        className={[
          'inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 text-[10px] font-semibold text-white/80',
          className || '',
        ].join(' ')}
        style={{ width: size, height: size }}
        aria-label={`${coin} icon`}
        title={coin}
      >
        {initials}
      </span>
    );
  }

  return (
    <span
      className={['inline-flex items-center justify-center', className || ''].join(' ')}
      style={{ width: size, height: size }}
      aria-label={`${coin} icon`}
      title={coin}
    >
      <Image
        src={src}
        alt={`${coin} icon`}
        width={size}
        height={size}
        className="rounded-full"
        priority={false}
        onError={() => setFailed(true)} // ✅ prevents broken image
      />
    </span>
  );
}
