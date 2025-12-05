// src/app/components/CountdownTrade.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Modal from './Modal';

type Direction = 'long' | 'short';
type TradeStatus = 'idle' | 'running' | 'settled';

type TradeFinishPayload = {
  pair: string;
  direction: Direction;
  amount: number;
  duration: number;
  entryPrice: number | null;
  exitPrice: number | null;
  won: boolean;
  payout: number;
  ts: number;
};

type CountdownTradeProps = {
  open: boolean;
  onClose: () => void;
  pair: string;
  amount: number;
  duration: number; // seconds
  direction: Direction;
  onFinish?: (result: TradeFinishPayload) => void;
};

const CountdownTrade: React.FC<CountdownTradeProps> = ({
  open,
  onClose,
  pair,
  amount,
  duration,
  direction,
  onFinish,
}) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [status, setStatus] = useState<TradeStatus>('idle');

  const [entryPrice, setEntryPrice] = useState<number | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [exitPrice, setExitPrice] = useState<number | null>(null);

  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'flat'>(
    'flat'
  );
  const [pnl, setPnl] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const priceRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (priceRef.current) clearInterval(priceRef.current);
    timerRef.current = null;
    priceRef.current = null;
  };

  // --- REAL PRICE FETCH (Binance public ticker) ---
  const fetchPrice = async () => {
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${pair}`
      );
      if (!res.ok) return;

      const data = (await res.json()) as { price: string };
      const price = Number(data.price);
      if (!Number.isFinite(price)) return;

      setCurrentPrice((prev) => {
        if (prev == null) {
          // first tick becomes entry
          setEntryPrice(price);
          setPriceDirection('flat');
          return price;
        }

        if (price > prev) setPriceDirection('up');
        else if (price < prev) setPriceDirection('down');
        else setPriceDirection((old) => old);

        return price;
      });
    } catch (err) {
      console.error('[CountdownTrade] price fetch failed', err);
    }
  };

  // Reset on open
  useEffect(() => {
    if (!open) {
      clearTimers();
      return;
    }

    setTimeLeft(duration);
    setStatus('running');
    setEntryPrice(null);
    setCurrentPrice(null);
    setExitPrice(null);
    setPnl(null);
    setPriceDirection('flat');

    clearTimers();

    // countdown timer
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearTimers();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // price polling
    fetchPrice(); // initial
    priceRef.current = setInterval(fetchPrice, 1500);

    return () => {
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, duration, pair, direction, amount]);

  // Settle when timer hits zero
  useEffect(() => {
    if (status === 'running' && timeLeft === 0) {
      handleSettle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, status]);

  const handleSettle = () => {
    clearTimers();

    const usedEntry = entryPrice ?? currentPrice ?? 0;
    const usedExit = currentPrice ?? entryPrice ?? 0;

    setExitPrice(usedExit);

    const isWin =
      direction === 'long' ? usedExit > usedEntry : usedExit < usedEntry;

    const payout = isWin ? amount * 1.8 : 0;
    const pnlValue = payout - amount;

    setPnl(pnlValue);
    setStatus('settled');

    if (onFinish) {
      const payload: TradeFinishPayload = {
        pair,
        direction,
        amount,
        duration,
        entryPrice: usedEntry,
        exitPrice: usedExit,
        won: isWin,
        payout,
        ts: Date.now(),
      };
      onFinish(payload);
    }
  };

  const handleClose = () => {
    clearTimers();
    setStatus('idle');
    setPnl(null);
    setExitPrice(null);
    onClose();
  };

  // --- TIMER CIRCLE ---
  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  const progress =
    duration > 0 && (status === 'running' || status === 'settled')
      ? ((duration - timeLeft) / duration) * circumference
      : 0;

  const formattedTime = `${Math.floor(timeLeft / 60)
    .toString()
    .padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')}`;

  const displayPrice =
    status === 'settled'
      ? exitPrice ?? currentPrice ?? entryPrice ?? 0
      : currentPrice ?? entryPrice ?? 0;

  const effectiveEntry = entryPrice ?? displayPrice;

  const tickerColorClass =
    priceDirection === 'up'
      ? 'text-emerald-400'
      : priceDirection === 'down'
      ? 'text-red-400'
      : 'text-slate-200';

  const pnlColorClass =
    pnl != null && pnl > 0
      ? 'text-emerald-400'
      : pnl != null && pnl < 0
      ? 'text-red-400'
      : 'text-slate-200';

  const pairLabel = pair.includes('/')
    ? pair
    : `${pair.replace('USDT', '')}/USDT`;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`${pair} ${direction.toUpperCase()} Trade`}
    >
      <div className="flex flex-col gap-5 text-slate-100">
        {/* LIVE TICKER STRIP */}
        <div className="flex items-center justify-between rounded-xl bg-slate-950/80 border border-cyan-500/20 px-4 py-2 text-xs md:text-sm">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold uppercase tracking-[0.16em] text-slate-200">
              Live Ticker
            </span>
            <span className="text-slate-400">• {pairLabel}</span>
          </div>
          <div className={`font-mono font-semibold ${tickerColorClass}`}>
            {displayPrice.toFixed(2)}
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-6 items-center">
          {/* NEON TIMER */}
          <div className="flex justify-center">
            <div className="relative flex items-center justify-center">
              <svg
                width={180}
                height={180}
                viewBox="0 0 180 180"
                className="neon-timer"
              >
                <circle
                  cx="90"
                  cy="90"
                  r={radius}
                  stroke="rgba(15,23,42,0.9)"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="90"
                  cy="90"
                  r={radius}
                  stroke="rgba(45,212,191,0.25)"
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={0}
                  className="neon-track"
                />
                <circle
                  cx="90"
                  cy="90"
                  r={radius}
                  stroke="rgb(45,212,191)"
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - progress}
                  strokeLinecap="round"
                  className="neon-progress"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400 mb-1">
                  Time Left
                </span>
                <span className="font-mono text-2xl md:text-3xl font-semibold text-cyan-300">
                  {formattedTime}
                </span>
                <span className="mt-1 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-0.5 text-[10px] uppercase tracking-[0.18em] text-cyan-300">
                  {status === 'settled' ? 'Settled' : 'In Contract'}
                </span>
              </div>
            </div>
          </div>

          {/* INFO + SETTLEMENT */}
          <div className="space-y-4">
            {/* Trade summary */}
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-xs md:text-sm">
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-400">Pair</span>
                <span className="font-semibold text-slate-100">
                  {pairLabel}
                </span>
              </div>
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-400">Direction</span>
                <span
                  className={
                    direction === 'long'
                      ? 'font-semibold text-emerald-400'
                      : 'font-semibold text-red-400'
                  }
                >
                  {direction.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-400">Stake</span>
                <span className="font-semibold text-slate-100">
                  ${amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-400">Entry Price</span>
                <span className="font-mono text-slate-100">
                  {effectiveEntry.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">
                  {status === 'settled' ? 'Exit Price' : 'Current Price'}
                </span>
                <span className="font-mono text-slate-100">
                  {displayPrice.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Settlement window – only amount, no win/loss words */}
            {status === 'settled' && pnl != null && (
              <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/90 px-4 py-3 text-xs md:text-sm shadow-[0_0_24px_rgba(6,182,212,0.35)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    Settlement
                  </span>
                  <span
                    className={`font-mono text-base md:text-lg font-semibold ${pnlColorClass}`}
                  >
                    {pnl > 0 ? '+' : ''}
                    {pnl.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-[11px] md:text-xs text-slate-300 mb-1">
                  <span>Entry</span>
                  <span className="font-mono">
                    {effectiveEntry.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] md:text-xs text-slate-300 mb-1">
                  <span>Exit</span>
                  <span className="font-mono">
                    {displayPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] md:text-xs text-slate-300">
                  <span>Stake</span>
                  <span className="font-mono">
                    ${amount.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={handleClose}
                  className="mt-3 w-full rounded-xl border border-cyan-400/60 bg-cyan-500/10 py-1.5 text-[11px] uppercase tracking-[0.18em] text-cyan-200 hover:bg-cyan-500/20 transition"
                >
                  Close
                </button>
              </div>
            )}

            {status !== 'settled' && (
              <p className="text-[11px] text-slate-500">
                Contract is active. Settlement window will appear
                automatically when the timer reaches zero.
              </p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CountdownTrade;
