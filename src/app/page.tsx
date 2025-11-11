'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import CountdownTrade from './components/CountdownTrade';
import Modal from './components/Modal';
import useLocalJson from './components/useLocalJson';
import useLocalNumber from './components/useLocalNumber';
import RecentTrades, { TradeResult } from './components/RecentTrades';

type Direction = 'long' | 'short';

function fmt(n: number, d = 2) {
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}

const DURATIONS = [
  { label: '1m', seconds: 60 },
  { label: '2m', seconds: 120 },
  { label: '3m', seconds: 180 },
  { label: '5m', seconds: 300 },
];

const PRESETS = [10, 20, 50, 100, 250];

export default function Home() {
  // ✅ persistent recent trades
  const [trades, setTrades] = useLocalJson<TradeResult[]>('coinvade.trades', []);

  // ✅ persistent balance (starts at 1000 USDT)
  const [balance, setBalance] = useLocalNumber('coinvade.balance', 1000);

  // quick trade state
  const [qtOpen, setQtOpen] = useState(false);
  const [pair, setPair] = useState('BTCUSDT'); // store Binance symbol internally
  const [amount, setAmount] = useState<number>(20);
  const [direction, setDirection] = useState<Direction>('long');
  const [duration, setDuration] = useState<number>(60);

  const [showCountdown, setShowCountdown] = useState(false);
  const [run, setRun] = useState<{pair: string; amount: number; direction: Direction; duration: number} | null>(null);

  const estPayout = useMemo(() => (isFinite(amount) && amount > 0 ? amount * 1.8 : 0), [amount]);
  const pairLabel = pair.includes('/') ? pair : `${pair.replace('USDT', '')}/USDT`;

  function startTrade() {
    if (!qtOpen) return;
    if (!isFinite(amount) || amount <= 0) return;
    if (!isFinite(duration) || duration <= 0) return;

    // Optional: prevent starting a trade if insufficient balance
    if (amount > balance) {
      alert('Not enough balance for this trade.');
      return;
    }

    setRun({ pair, amount, direction, duration });
    setShowCountdown(true);
    setQtOpen(false);
  }

  function onCountdownClose() {
    setShowCountdown(false);
    setRun(null);
  }

  // ✅ Update balance + store trade when a trade finishes
  function onTradeFinish(res: {
    pair: string;
    direction: Direction;
    amount: number;
    duration: number;
    entryPrice: number | null;
    exitPrice: number | null;
    won: boolean;
    payout: number;
    ts: number;
  }) {
    const record: TradeResult = {
      id: `${res.ts}-${Math.random().toString(36).slice(2, 7)}`,
      ts: res.ts,
      pair: res.pair,
      direction: res.direction,
      amount: res.amount,
      duration: res.duration,
      entryPrice: Number(res.entryPrice ?? 0),
      exitPrice: Number(res.exitPrice ?? 0),
      won: res.won,
      payout: res.payout,
    };
    setTrades((prev) => [record, ...prev].slice(0, 100));

    // 🔁 Balance logic:
    // On win: add payout.
    // On loss: subtract the staked amount (never below 0).
    setBalance((b) => {
      const next = res.won ? b + res.payout : Math.max(0, b - res.amount);
      return Number.isFinite(next) ? next : b;
    });
  }

  return (
    <main className="min-h-screen px-6 pb-16 pt-6 text-white">
      {/* top bar */}
      <div className="mb-10 flex items-center justify-between">
        <div className="text-lg tracking-wide text-[var(--neon)]">COINVADE</div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-white/15 bg-black/30 px-4 py-2 text-sm">
            <div className="text-white/60">Balance</div>
            <div className="font-semibold">{fmt(balance)} USDT</div>
          </div>
          {/* quick add + reset */}
          <button
            className="rounded-xl border border-emerald-400/30 bg-emerald-400/15 px-3 py-2 text-emerald-200 hover:border-emerald-400/60"
            onClick={() => setBalance((b) => b + 100)}
          >
            +100
          </button>
          <button
            className="rounded-xl border border-rose-400/30 bg-rose-400/15 px-3 py-2 text-rose-200 hover:border-rose-400/60"
            onClick={() => setBalance(1000)}
          >
            Reset
          </button>
        </div>
      </div>

      {/* headline */}
      <h1 className="mx-auto mb-8 max-w-5xl text-center text-5xl font-extrabold text-white [text-shadow:_0_0_38px_var(--neon-soft)] sm:text-6xl">
        Welcome to Coinvade
      </h1>

      {/* nav links */}
      <div className="mb-10 flex items-center justify-center gap-8 text-white/80">
        <Nav to="#" label="Verify" />
        <Nav to="/markets" label="Markets" />
        <Nav to="#" label="AI Quant" />
        <Nav to="#" label="Support" />
        <Nav to="#" label="Whitepaper" />
        <Nav to="/wallet" label="Wallet" />
      </div>

      {/* CTA */}
      <div className="mt-10 flex justify-center">
        <button
          onClick={() => setQtOpen(true)}
          className="rounded-2xl border border-cyan-400/30 bg-cyan-500/80 px-6 py-3 text-black shadow-[0_0_24px_rgba(0,224,255,.45)] transition hover:bg-cyan-400"
        >
          Start Quick Trade
        </button>
      </div>

      {/* QUICK TRADE MODAL */}
      <Modal open={qtOpen} onClose={() => setQtOpen(false)} title="Quick Trade">
        {/* Pair */}
        <div className="mb-4">
          <label className="mb-1 block text-sm text-white/70">Pair</label>
          <select
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none"
            value={pair}
            onChange={(e) => setPair(e.target.value)}
          >
            <option value="BTCUSDT">BTC/USDT</option>
            <option value="ETHUSDT">ETH/USDT</option>
            <option value="SOLUSDT">SOL/USDT</option>
          </select>
          <div className="mt-1 text-xs text-white/40">Selected: {pairLabel}</div>
        </div>

        {/* Amount */}
        <div className="mb-4">
          <label className="mb-1 block text-sm text-white/70">Amount (USDT)</label>
          <input
            type="number"
            min={1}
            inputMode="decimal"
            value={Number.isFinite(amount) ? amount : ''}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESETS.map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                className={`rounded-xl border px-3 py-1 text-sm transition ${
                  amount === v ? 'border-cyan-400/50 bg-cyan-400/20' : 'border-white/10 bg-white/5 hover:border-white/30'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="mt-1 text-xs text-white/60">
            Payout (demo): <span className="text-cyan-300">{fmt(estPayout)} USDT</span>
          </div>
        </div>

        {/* Direction */}
        <div className="mb-4">
          <label className="mb-1 block text-sm text-white/70">Direction</label>
          <div className="flex gap-2">
            <button
              onClick={() => setDirection('long')}
              className={`flex-1 rounded-xl border px-3 py-2 transition ${
                direction === 'long'
                  ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200'
                  : 'border-white/10 bg-white/5 text-white/80 hover:border-white/30'
              }`}
            >
              Buy (Long)
            </button>
            <button
              onClick={() => setDirection('short')}
              className={`flex-1 rounded-xl border px-3 py-2 transition ${
                direction === 'short'
                  ? 'border-rose-400/40 bg-rose-400/15 text-rose-200'
                  : 'border-white/10 bg-white/5 text-white/80 hover:border-white/30'
              }`}
            >
              Sell (Short)
            </button>
          </div>
        </div>

        {/* Duration */}
        <div className="mb-6">
          <label className="mb-1 block text-sm text-white/70">Duration</label>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.seconds}
                onClick={() => setDuration(d.seconds)}
                className={`rounded-xl border px-3 py-1 transition ${
                  duration === d.seconds ? 'border-cyan-400/50 bg-cyan-400/20' : 'border-white/10 bg-white/5 hover:border-white/30'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Start */}
        <button
          onClick={startTrade}
          className="mt-1 w-full rounded-2xl border border-cyan-400/30 bg-cyan-500/80 px-5 py-3 text-black shadow-[0_0_22px_rgba(0,224,255,.35)] transition hover:bg-cyan-400"
        >
          Start Trade
        </button>
      </Modal>

      {/* COUNTDOWN / RUNNING TRADE */}
      {run && (
        <CountdownTrade
          open={showCountdown}
          onClose={onCountdownClose}
          onFinish={onTradeFinish}
          pair={run.pair}
          amount={run.amount}
          duration={run.duration}
          direction={run.direction}
        />
      )}

      {/* RECENT TRADES */}
      <RecentTrades items={trades} />
    </main>
  );
}

function Nav({ to, label }: { to: string; label: string }) {
  const inner = (
    <span className="nav-link inline-block rounded-xl border border-white/10 px-3 py-1 text-white/80 hover:text-white">
      {label}
    </span>
  );
  return to.startsWith('/') ? <Link href={to}>{inner}</Link> : <a href={to}>{inner}</a>;
}
