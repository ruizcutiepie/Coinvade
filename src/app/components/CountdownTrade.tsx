'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';

type Direction = 'long' | 'short';

type CountdownTradeProps = {
  open: boolean;
  onClose: () => void;

  pair: string;
  amount: number;
  duration: number; // seconds
  direction: Direction;

  // Optional display-only info (your trade/page.tsx can pass these if you want)
  tradeId?: string | null;
  entryPrice?: number | null;

  // IMPORTANT: This should just signal "timer done"
  onFinish: (res: {
    pair: string;
    direction: Direction;
    amount: number;
    duration: number;
    ts: number;
  }) => void;
};

export default function CountdownTrade(props: CountdownTradeProps) {
  const {
    open,
    onClose,
    pair,
    amount,
    duration,
    direction,
    tradeId = null,
    entryPrice = null,
    onFinish,
  } = props;

  const [secondsLeft, setSecondsLeft] = useState(duration);

  const dirLabel = useMemo(
    () => (direction === 'long' ? 'LONG' : 'SHORT'),
    [direction]
  );

  // Reset timer whenever modal opens or duration changes
  useEffect(() => {
    if (!open) return;
    setSecondsLeft(duration);
  }, [open, duration]);

  // Timer tick
  useEffect(() => {
    if (!open) return;
    if (secondsLeft <= 0) return;

    const t = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);

    return () => clearInterval(t);
  }, [open, secondsLeft]);

  // Fire onFinish exactly once when hits 0
  useEffect(() => {
    if (!open) return;
    if (secondsLeft !== 0) return;

    onFinish({
      pair,
      direction,
      amount,
      duration,
      ts: Date.now(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  return (
    <Modal open={open} onClose={onClose} title="Trade countdown">
      <div className="space-y-3">
        <div className="text-sm text-white/70">
          Pair: <span className="text-white">{pair}</span> • Dir:{' '}
          <span className="text-white">{dirLabel}</span>
        </div>

        <div className="text-sm text-white/70">
          Stake: <span className="text-white/90">{amount.toFixed(2)}</span>
        </div>

        <div className="text-sm text-white/70">
          Trade ID:{' '}
          <span className="text-white/90">
            {tradeId ? tradeId : '—'}
          </span>
        </div>

        <div className="text-sm text-white/70">
          Entry:{' '}
          <span className="text-white/90">
            {entryPrice != null ? entryPrice.toLocaleString() : '—'}
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-center">
          <div className="text-xs uppercase tracking-widest text-white/50">
            Time left
          </div>
          <div className="mt-2 text-4xl font-semibold text-cyan-200">
            {Math.max(0, secondsLeft)}s
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs text-white/80 hover:border-white/40"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
