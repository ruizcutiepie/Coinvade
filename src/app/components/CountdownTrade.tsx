// src/app/components/CountdownTrade.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Modal from './Modal';

type Direction = 'long' | 'short';

type FinishPayload = {
  pair: string;
  direction: Direction;
  amount: number;
  duration: number;
  ts: number;
};

export type ResolveResult = {
  won: boolean | null; // true=win, false=lose, null=tie
  delta: number; // NET CHANGE (win +0.8*stake, lose -stake, tie 0)
  exitPrice: number;
};

type CountdownTradeProps = {
  open: boolean;
  onClose: () => void;

  pair: string;
  amount: number;
  duration: number; // seconds
  direction: Direction;

  tradeId?: string | null;
  entryPrice?: number | null;

  onFinish: (res: FinishPayload) => Promise<ResolveResult | void>;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

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

  const safeDuration = Number.isFinite(duration) ? Math.max(1, Math.floor(duration)) : 1;
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const hasValidStake = safeAmount > 0;

  const [secondsLeft, setSecondsLeft] = useState(safeDuration);
  const [phase, setPhase] = useState<'countdown' | 'settling' | 'settled'>('countdown');

  const finishedRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dirLabel = useMemo(() => (direction === 'long' ? 'LONG' : 'SHORT'), [direction]);

  const progress = useMemo(() => {
    const done = safeDuration - secondsLeft;
    return clamp(done / safeDuration, 0, 1);
  }, [secondsLeft, safeDuration]);

  const [settlement, setSettlement] = useState<ResolveResult | null>(null);
  const [settleError, setSettleError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    finishedRef.current = false;
    setPhase('countdown');
    setSettlement(null);
    setSettleError(null);
    setSecondsLeft(safeDuration);

    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, [open, safeDuration]);

  useEffect(() => {
    if (!open) return;
    if (!hasValidStake) return;
    if (phase !== 'countdown') return;
    if (secondsLeft <= 0) return;

    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }

    tickRef.current = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [open, secondsLeft, phase, hasValidStake]);

  useEffect(() => {
    if (!open) return;
    if (!hasValidStake) return;
    if (phase !== 'countdown') return;
    if (secondsLeft !== 0) return;
    if (finishedRef.current) return;

    finishedRef.current = true;

    const run = async () => {
      try {
        setPhase('settling');

        const ts = Date.now();
        const result = await onFinish({
          pair,
          direction,
          amount: safeAmount,
          duration: safeDuration,
          ts,
        });

        if (!result) {
          setSettleError('Settlement completed, but no result was returned.');
          setPhase('settled');
          return;
        }

        setTimeout(() => {
          setSettlement(result);
          setPhase('settled');
        }, 450);
      } catch (e: any) {
        console.error('[CountdownTrade] onFinish failed:', e);
        setSettleError(e?.message || 'Failed to settle trade.');
        setPhase('settled');
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, open, hasValidStake, phase]);

  const size = 170;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dashOffset = c * (1 - progress);

  const ringGlow =
    'drop-shadow(0 0 10px rgba(34,211,238,.65)) drop-shadow(0 0 20px rgba(34,211,238,.35))';

  const deltaText = settlement ? `${settlement.delta >= 0 ? '+' : ''}${settlement.delta.toFixed(2)}` : '—';

  const deltaClass =
    settlement && settlement.delta >= 0 ? 'text-emerald-300' : 'text-rose-300';

  return (
    <Modal open={open} onClose={onClose} title={phase === 'settled' ? 'Settlement' : 'Trade countdown'}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="text-white/70">
            Pair: <span className="text-white">{pair}</span>
          </div>
          <div className="text-white/70">
            Dir: <span className="text-white">{dirLabel}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
            <div className="text-xs uppercase tracking-widest text-white/50">Stake</div>
            <div className="mt-1 font-semibold text-white/90">
              {Number.isFinite(safeAmount) ? safeAmount.toFixed(2) : '—'}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
            <div className="text-xs uppercase tracking-widest text-white/50">Trade ID</div>
            <div className="mt-1 font-semibold text-white/90">{tradeId ? tradeId : '—'}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
            <div className="text-xs uppercase tracking-widest text-white/50">Entry</div>
            <div className="mt-1 font-semibold text-white/90">
              {entryPrice != null ? entryPrice.toLocaleString() : '—'}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
            <div className="text-xs uppercase tracking-widest text-white/50">Duration</div>
            <div className="mt-1 font-semibold text-white/90">{safeDuration}s</div>
          </div>
        </div>

        {!hasValidStake && (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
            No balance / invalid stake. Please deposit first, then try again.
          </div>
        )}

        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-5">
          {phase === 'countdown' ? (
            <>
              <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="block">
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke="rgba(255,255,255,.12)"
                    strokeWidth={stroke}
                    fill="transparent"
                  />
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke="rgba(34,211,238,.95)"
                    strokeWidth={stroke}
                    fill="transparent"
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={dashOffset}
                    style={{
                      transform: 'rotate(-90deg)',
                      transformOrigin: '50% 50%',
                      filter: ringGlow,
                      transition: 'stroke-dashoffset 450ms linear',
                    }}
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-xs uppercase tracking-widest text-white/50">Time left</div>
                  <div className="mt-1 text-5xl font-semibold text-cyan-200 [text-shadow:_0_0_18px_rgba(34,211,238,.35)]">
                    {Math.max(0, secondsLeft)}s
                  </div>
                </div>
              </div>

              <div className="text-xs text-white/50">Executing trade… please wait for settlement.</div>
            </>
          ) : phase === 'settling' ? (
            <>
              <div className="text-xs uppercase tracking-widest text-white/50">Settling</div>
              <div className="text-3xl font-semibold text-cyan-200 [text-shadow:_0_0_18px_rgba(34,211,238,.35)]">
                Please wait…
              </div>
              <div className="text-xs text-white/50">Fetching final price & updating wallet.</div>
            </>
          ) : (
            <>
              <div className="text-xs uppercase tracking-widest text-white/50">Result</div>

              {settleError ? (
                <div className="w-full rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-center text-sm text-rose-200">
                  {settleError}
                </div>
              ) : (
                <>
                  <div className={`text-5xl font-semibold ${deltaClass} [text-shadow:_0_0_18px_rgba(255,255,255,.12)]`}>
                    {deltaText}
                  </div>

                  <div className="text-xs text-white/50">
                    {settlement
                      ? settlement.won === true
                        ? 'Profit credited'
                        : settlement.won === false
                        ? 'Loss recorded'
                        : 'Tie refunded'
                      : '—'}
                  </div>

                  <div className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-center text-xs text-white/70">
                    Exit price:{' '}
                    <span className="text-white/90">
                      {settlement?.exitPrice ? settlement.exitPrice.toLocaleString() : '—'}
                    </span>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
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
