'use client';

import React from 'react';

type Props = {
  coin: string; // "BTC", "ETH", "USDT"
  size?: number;
  className?: string;
};

// Simple local SVG fallback icons (no external fetching = no Vercel issues)
function SvgCircle({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.25)" />
    </svg>
  );
}

function SvgText({ size, text }: { size: number; text: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="rgba(0,200,255,0.12)" stroke="rgba(0,200,255,0.35)" />
      <text
        x="12"
        y="13.5"
        textAnchor="middle"
        fontSize="9"
        fontFamily="ui-sans-serif, system-ui"
        fill="rgba(255,255,255,0.85)"
        fontWeight="700"
      >
        {text}
      </text>
    </svg>
  );
}

export default function CoinIcon({ coin, size = 20, className }: Props) {
  const c = String(coin || '').toUpperCase();

  // You can later replace these with real SVG logos if you want,
  // but this fixes "icons not showing" immediately (no remote assets).
  if (c === 'BTC') return <SvgText size={size} text="BTC" />;
  if (c === 'ETH') return <SvgText size={size} text="ETH" />;
  if (c === 'SOL') return <SvgText size={size} text="SOL" />;
  if (c === 'XRP') return <SvgText size={size} text="XRP" />;
  if (c === 'USDT') return <SvgText size={size} text="USDT" />;

  return (
    <span className={className} title={c}>
      <SvgCircle size={size} />
    </span>
  );
}
