'use client';

import React from 'react';

type Props = {
  coin: string;
  size?: number;
  className?: string;
};

/**
 * CoinIcon (NO <img> / NO next/image)
 * - Always renders a stable inline icon (won't blink / won't break on Vercel)
 * - Uses coin letter + subtle glow so it still looks "premium"
 */
export default function CoinIcon({ coin, size = 18, className = '' }: Props) {
  const c = (coin || '').toUpperCase();

  // Small per-coin accent (optional)
  const accent =
    c === 'BTC'
      ? 'from-amber-400/90 to-amber-200/40'
      : c === 'ETH'
      ? 'from-indigo-300/90 to-indigo-200/30'
      : c === 'SOL'
      ? 'from-cyan-300/90 to-fuchsia-300/30'
      : c === 'XRP'
      ? 'from-slate-200/80 to-slate-400/30'
      : c === 'ADA'
      ? 'from-sky-300/90 to-sky-200/30'
      : c === 'BNB'
      ? 'from-yellow-300/90 to-yellow-200/30'
      : c === 'DOGE'
      ? 'from-yellow-200/90 to-amber-200/30'
      : c === 'DOT'
      ? 'from-pink-300/90 to-pink-200/30'
      : c === 'USDT'
      ? 'from-emerald-300/90 to-emerald-200/30'
      : 'from-white/30 to-white/10';

  const letter = c ? c[0] : '?';

  const px = Math.max(14, size); // keep legible
  const fontSize = Math.max(9, Math.floor(px * 0.48));

  return (
    <span
      className={[
        'inline-flex items-center justify-center rounded-full',
        'border border-white/10 bg-gradient-to-b',
        accent,
        'shadow-[0_0_18px_rgba(0,255,255,0.10)]',
        className,
      ].join(' ')}
      style={{
        width: px,
        height: px,
        fontSize,
        lineHeight: 1,
      }}
      aria-label={`${c} icon`}
      title={c}
    >
      <span className="font-semibold text-black/80">{letter}</span>
    </span>
  );
}
