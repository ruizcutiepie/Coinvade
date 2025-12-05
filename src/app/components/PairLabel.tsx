// src/app/components/PairLabel.tsx
import React from 'react';

type Props = {
  symbol: string;             // e.g. "BTCUSDT"
  className?: string;
  textClassName?: string;
};

const PAIR_META: Record<
  string,
  { label: string; icon: string }
> = {
  BTCUSDT: { label: 'BTC / USDT', icon: '/coins/btc.svg' },
  ETHUSDT: { label: 'ETH / USDT', icon: '/coins/eth.svg' },
  SOLUSDT: { label: 'SOL / USDT', icon: '/coins/sol.svg' },
  XRPUSDT: { label: 'XRP / USDT', icon: '/coins/xrp.svg' },
};

export default function PairLabel({
  symbol,
  className = '',
  textClassName = '',
}: Props) {
  const meta =
    PAIR_META[symbol] ?? {
      label: symbol,
      icon: '/coins/btc.svg', // safe fallback
    };

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img
        src={meta.icon}
        alt={meta.label}
        className="h-5 w-5 rounded-full border border-white/20 bg-black/40 object-contain"
      />
      <span className={`text-sm ${textClassName}`}>{meta.label}</span>
    </span>
  );
}
