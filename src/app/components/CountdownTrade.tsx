// src/app/components/CountdownTrade.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Modal from './Modal';

type Direction = 'long' | 'short';

type Props = {
  open: boolean;
  onClose: () => void;
  onFinish?: (result: {
    pair: string; direction: Direction; amount: number; duration: number;
    entryPrice: number | null; exitPrice: number | null; won: boolean; payout: number; ts: number;
  }) => void;
  pair: string;          // "BTC/USDT" or "BTCUSDT"
  amount: number;        // USDT
  direction: Direction;
  duration: number;      // seconds
};

function fmt(n: number, decimals = 2) {
  return n.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}
function toExchangeSymbol(input: string) {
  return input.toUpperCase().replace('/', '');
}

export default function CountdownTrade({ open, onClose, onFinish, pair, amount, direction, duration }: Props) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [done, setDone] = useState(false);
  const [won, setWon] = useState<boolean | null>(null);
  const [payout, setPayout] = useState(0);

  const [entryPrice, setEntryPrice] = useState<number | null>(null);
  const [livePrice, setLivePrice] = useState<number | null>(null);

  const endAtRef = useRef<number | null>(null);
  const symbol = useMemo(() => toExchangeSymbol(pair), [pair]);

  // countdown
  useEffect(() => {
    if (!open) return;
    if (!isFinite(amount) || amount <= 0) return;
    if (!isFinite(duration) || duration <= 0) return;

    setDone(false);
    setWon(null);
    setPayout(0);
    setTimeLeft(duration);
    endAtRef.current = Date.now() + duration * 1000;

    const t = setInterval(() => {
      const remaining = Math.max(0, Math.ceil(((endAtRef.current ?? 0) - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(t);
        const ep = entryPrice;
        const lp = livePrice;
        let didWin: boolean;
        let out = 0;

        if (typeof ep === 'number' && typeof lp === 'number') {
          didWin = direction === 'long' ? lp >= ep : lp <= ep;
          out = didWin ? amount * 1.8 : 0;
        } else {
          didWin = Math.random() > 0.5;
          out = didWin ? amount * 1.8 : 0;
        }

        setWon(didWin);
        setPayout(out);
        setDone(true);

        // notify parent
        onFinish?.({
          pair: symbol,
          direction,
          amount,
          duration,
          entryPrice: ep ?? 0,
          exitPrice: lp ?? 0,
          won: didWin,
          payout: out,
          ts: Date.now(),
        });
      }
    }, 250);

    return () => clearInterval(t);
  }, [open, amount, duration, direction, entryPrice, livePrice, onFinish, symbol]);

  // price polling
  useEffect(() => {
    if (!open) return;
    let stopped = false;

    const load = async () => {
      try {
        const res = await fetch(`/api/price?symbol=${symbol}`, { cache: 'no-store' });
        const data = await res.json();
        if (!stopped && typeof data?.price === 'number') {
          setLivePrice(data.price);
          setEntryPrice((prev) => (prev == null ? data.price : prev));
        }
      } catch {}
    };

    load();
    const id = setInterval(load, 3000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [open, symbol]);

  const canClose = done;

  const headRight = useMemo(
    () => (
      <div className="absolute right-6 top-6 select-none text-[var(--neon)] font-semibold">
        {livePrice == null ? '…' : fmt(livePrice, livePrice >= 100 ? 2 : 4)}
      </div>
    ),
    [livePrice]
  );

  // visuals
  const delta = useMemo(() => {
    if (entryPrice == null || livePrice == null) return null;
    const diff = livePrice - entryPrice;
    const pct = (diff / entryPrice) * 100;
    return { diff, pct };
  }, [entryPrice, livePrice]);
  const deltaClass = delta == null ? 'text-white/60' : delta.diff >= 0 ? 'text-emerald-400' : 'text-rose-400';

  return (
    <Modal open={open} onClose={canClose ? onClose : undefined} title="Trade Running">
      {headRight}

      <div className="mb-4 text-sm text-white/60">
        Pair:&nbsp;
        <span className="text-white font-medium">
          {pair.includes('/') ? pair.toUpperCase() : `${pair.replace('USDT', '')}/USDT`}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Box label="Amount">{isFinite(amount) ? `${fmt(amount)} USDT` : '--'}</Box>
        <Box label="Direction">{direction === 'long' ? 'Buy (Long)' : 'Sell (Short)'}</Box>
        <Box label="Entry Price">{entryPrice == null ? '…' : fmt(entryPrice, entryPrice >= 100 ? 2 : 4)}</Box>
        <Box label="Current Price">{livePrice == null ? '…' : fmt(livePrice, livePrice >= 100 ? 2 : 4)}</Box>
        <Box label="Time Left">{isFinite(timeLeft) ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}` : '--:--'}</Box>
        <Box label="Change">
          {delta == null ? '…' : (
            <span className={`font-semibold ${deltaClass}`}>
              {delta.diff >= 0 ? '+' : ''}{fmt(delta.diff, livePrice! >= 100 ? 2 : 4)} ({delta.pct >= 0 ? '+' : ''}{fmt(delta.pct, 2)}%)
            </span>
          )}
        </Box>
        <Box label="Payout (demo)">{isFinite(payout) ? `${fmt(payout)} USDT` : '--'}</Box>
      </div>

      <div className={`mt-6 rounded-xl border px-4 py-4 ${done ? (won ? 'border-teal-700/40 bg-teal-900/20' : 'border-rose-700/40 bg-rose-900/20') : 'border-white/10 bg-white/5'} text-center`}>
        {done ? (
          <span className={`text-lg font-semibold ${won ? 'text-teal-300' : 'text-rose-300'}`}>
            {won ? 'You won!' : 'You lost.'}
          </span>
        ) : (
          <span className="text-white/70">Running…</span>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onClose}
          disabled={!canClose}
          className={`px-5 py-2 rounded-xl border transition ${canClose ? 'border-white/20 hover:border-white/40 text-white' : 'border-white/10 text-white/40 cursor-not-allowed'}`}
        >
          Close
        </button>
      </div>
    </Modal>
  );
}

function Box({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="text-sm text-white/60">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{children}</div>
    </div>
  );
}
