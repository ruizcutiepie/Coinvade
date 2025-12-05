// src/app/trade/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import CountdownTrade from '../components/CountdownTrade';
import Modal from '../components/Modal';
import useLocalJson from '../components/useLocalJson';
import RecentTrades, { TradeResult } from '../components/RecentTrades';
import {
  useLang,
  LANG_OPTIONS,
  tr,
  type LangCode,
} from '../components/useLang';
import WalletBalance from '../components/WalletBalance';

type Direction = 'long' | 'short';

function fmt(n: number, d = 2) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

const DURATIONS = [
  { label: '30 second', seconds: 30, profit: '15%' },
  { label: '45 second', seconds: 45, profit: '20%' },
  { label: '60 second', seconds: 60, profit: '35%' },
  { label: '90 second', seconds: 90, profit: '65%' },
  { label: '120 second', seconds: 120, profit: '90%' },
  { label: '180 second', seconds: 180, profit: '92%' },
  { label: '240 second', seconds: 240, profit: '93%' },
  { label: '300 second', seconds: 300, profit: '95%' },
];

const PRESETS = [10, 20, 50, 100, 250];

export default function TradePage() {
  const [trades, setTrades] = useLocalJson<TradeResult[]>(
    'coinvade.trades',
    []
  );

  // Wallet balance shared across UI
  const [balance, setBalance] = useState<number | null>(null);

  const { lang, setLang } = useLang();
  const currentLang =
    LANG_OPTIONS.find((l) => l.code === lang) ?? LANG_OPTIONS[0];

  // trading state
  const [pair, setPair] = useState('BTCUSDT');
  const [mode, setMode] = useState<'USDT' | 'SNX'>('USDT');
  const [amount, setAmount] = useState<number>(20);
  const [duration, setDuration] = useState<number>(60);
  const [direction, setDirection] = useState<Direction>('long');

  const [showCountdown, setShowCountdown] = useState(false);
  const [run, setRun] = useState<{
    pair: string;
    amount: number;
    direction: Direction;
    duration: number;
  } | null>(null);

  // confirmation popup state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingTrade, setPendingTrade] = useState<{
    pair: string;
    amount: number;
    direction: Direction;
    duration: number;
  } | null>(null);

  const estPayout = useMemo(
    () => (isFinite(amount) && amount > 0 ? amount * 1.8 : 0),
    [amount]
  );

  const pairLabel = pair.includes('/')
    ? pair
    : `${pair.replace('USDT', '')}/USDT`;

  // Load wallet balance from backend and broadcast
  async function loadWallet() {
    try {
      const res = await fetch('/api/wallet/info', { cache: 'no-store' });
      const j = await res.json();
      if (res.ok && j?.ok && j.wallet) {
        const next = Number(j.wallet.balance ?? 0);
        setBalance(next);

        if (typeof window !== 'undefined') {
          window.localStorage.setItem('coinvade.walletBalance', String(next));
          window.dispatchEvent(
            new CustomEvent('coinvade-wallet-updated', {
              detail: { balance: next },
            })
          );
        }
      }
    } catch (err) {
      console.error('[trade] failed to load wallet', err);
    }
  }

  useEffect(() => {
    // Try localStorage first so all tabs share a value
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('coinvade.walletBalance');
      if (stored != null && !Number.isNaN(Number(stored))) {
        const next = Number(stored);
        setBalance(next);
        window.dispatchEvent(
          new CustomEvent('coinvade-wallet-updated', {
            detail: { balance: next },
          })
        );
        return;
      }
    }
    // Fallback to backend
    loadWallet();
  }, []);

  function handleOpenConfirm(nextDirection: Direction) {
    if (!isFinite(amount) || amount <= 0) return;
    if (!isFinite(duration) || duration <= 0) return;

    // front-end guard (backend will still validate)
    if (balance != null && amount > balance) {
      alert('Not enough balance for this trade.');
      return;
    }

    setPendingTrade({
      pair,
      amount,
      direction: nextDirection,
      duration,
    });
    setConfirmOpen(true);
  }

  function startConfirmedTrade() {
    if (!pendingTrade) return;

    const { pair, amount, direction, duration } = pendingTrade;

    setDirection(direction);
    setRun({ pair, amount, direction, duration });
    setShowCountdown(true);

    setConfirmOpen(false);
    setPendingTrade(null);
  }

  function onCountdownClose() {
    setShowCountdown(false);
    setRun(null);
  }

  // Called when CountdownTrade finishes (timer hit 0)
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
    // Keep TS signature sync by wrapping async logic
    (async () => {
      try {
        const response = await fetch('/api/trades/settle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(res),
        });

        const j = await response.json();

        if (!response.ok || !j?.ok) {
          console.error('[trade] backend settle failed', j);

          // Fallback: still record client-side result so user sees something
          const fallbackRecord: TradeResult = {
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
          setTrades((prev) => [fallbackRecord, ...prev].slice(0, 100));
          return;
        }

        const serverTrade = j.trade;
        const serverWallet = j.wallet;

        const record: TradeResult = {
          id: serverTrade.id,
          ts: serverTrade.ts,
          pair: serverTrade.pair,
          direction: serverTrade.direction,
          amount: serverTrade.amount,
          duration: serverTrade.duration,
          entryPrice: serverTrade.entryPrice,
          exitPrice: serverTrade.exitPrice,
          won: serverTrade.won,
          payout: serverTrade.payout,
        };

        setTrades((prev) => [record, ...prev].slice(0, 100));

        // Use server's balance as source of truth
        const nextBalance = Number(serverWallet.balance);
        setBalance(nextBalance);

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            'coinvade.walletBalance',
            String(nextBalance)
          );
          window.dispatchEvent(
            new CustomEvent('coinvade-wallet-updated', {
              detail: { balance: nextBalance },
            })
          );
        }
      } catch (err) {
        console.error('[trade] onTradeFinish error', err);

        const fallbackRecord: TradeResult = {
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
        setTrades((prev) => [fallbackRecord, ...prev].slice(0, 100));
      }
    })();
  }

  return (
    <main className="min-h-screen px-6 pb-16 pt-6 text-white">
      {/* top bar */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="text-lg tracking-wide text-[var(--neon)]">COINVADE</div>

        <div className="flex items-center gap-3">
          {/* desktop language selector */}
          <div className="hidden items-center gap-2 rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white/70 sm:flex">
            <span className="text-lg">{currentLang.flag}</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as LangCode)}
              className="bg-transparent text-xs outline-none"
            >
              {LANG_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.flag} {opt.name}
                </option>
              ))}
            </select>
          </div>

          {/* top-right wallet */}
          <WalletBalance />
        </div>
      </div>

      {/* floating mobile language selector */}
      <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full border border-white/20 bg-black/70 px-3 py-2 text-xs text-white/80 shadow-lg sm:hidden">
        <span>{currentLang.flag}</span>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as LangCode)}
          className="bg-transparent text-xs outline-none"
        >
          {LANG_OPTIONS.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.flag} {opt.name}
            </option>
          ))}
        </select>
      </div>

      {/* nav */}
      <div className="mb-6 flex items-center justify-center gap-6 text-sm text-white/80">
        <Nav to="/" label={tr('nav.markets', lang)} />
        <Nav to="/trade" label={tr('nav.trade', lang)} />
        <Nav to="/wallet" label={tr('nav.wallet', lang)} />
      </div>

      {/* trading layout */}
      <section className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-black/40 p-5 shadow-[0_0_40px_rgba(0,0,0,.6)]">
        {/* durations */}
        <div className="mb-6 flex flex-wrap gap-3">
          {DURATIONS.map((d) => (
            <button
              key={d.seconds}
              onClick={() => setDuration(d.seconds)}
              className={`min-w-[120px] rounded-xl border px-4 py-2 text-left text-xs transition ${
                duration === d.seconds
                  ? 'border-cyan-400/60 bg-cyan-500/20 shadow-[0_0_14px_rgba(0,224,255,.45)]'
                  : 'border-white/10 bg-black/40 hover:border-white/40'
              }`}
            >
              <div className="text-sm font-semibold text-white">
                {d.label}
              </div>
              <div className="mt-1 text-[11px] text-white/60">
                {tr('trade.profitRate', lang)}{' '}
                <span className="ml-1 text-cyan-300">{d.profit}</span>
              </div>
            </button>
          ))}
        </div>

        {/* transaction mode */}
        <div className="mb-4 text-sm text-white/60">
          {tr('trade.transactionMode', lang)}
        </div>
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setMode('USDT')}
            className={`min-w-[120px] rounded-xl border px-4 py-2 text-sm transition ${
              mode === 'USDT'
                ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-100'
                : 'border-white/10 bg-black/40 text-white/70 hover:border-white/40'
            }`}
          >
            USDT
          </button>
          <button
            onClick={() => setMode('SNX')}
            className={`min-w-[120px] rounded-xl border px-4 py-2 text-sm transition ${
              mode === 'SNX'
                ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-100'
                : 'border-white/10 bg-black/40 text-white/70 hover:border-white/40'
            }`}
          >
            SNX
          </button>
        </div>

        {/* pair selector */}
        <div className="mb-4 max-w-xs">
          <label className="mb-1 block text-xs text-white/60">
            Trading pair
          </label>
          <select
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none"
            value={pair}
            onChange={(e) => setPair(e.target.value)}
          >
            <option value="BTCUSDT">BTC/USDT</option>
            <option value="ETHUSDT">ETH/USDT</option>
            <option value="SOLUSDT">SOL/USDT</option>
            <option value="XRPUSDT">XRP/USDT</option>
            <option value="ADAUSDT">ADA/USDT</option>
          </select>
          <div className="mt-1 text-[11px] text-white/50">
            Selected: <span className="text-white/80">{pairLabel}</span>
          </div>
        </div>

        {/* amount input */}
        <div className="mb-2 text-sm text-white/60">
          {tr('trade.openingQty', lang)}
        </div>
        <div className="mb-4">
          <input
            type="number"
            min={1}
            inputMode="decimal"
            value={Number.isFinite(amount) ? amount : ''}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
            className="block w-full rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-lg outline-none"
            placeholder="0"
          />
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {PRESETS.map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                className={`rounded-xl border px-3 py-1 transition ${
                  amount === v
                    ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-100'
                    : 'border-white/10 bg-black/40 text-white/70 hover:border-white/30'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="mt-2 text-[11px] text-white/60">
            Estimated payout:{' '}
            <span className="text-cyan-300">
              {fmt(estPayout)} {mode}
            </span>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between text-xs text-white/50">
          <span>{tr('trade.accountLabel', lang)}</span>
          <span>
            {balance != null ? fmt(balance, 2) : '—'} {mode}
          </span>
        </div>

        {/* big Buy / Sell buttons (open confirmation) */}
        <div className="mb-4 flex gap-3">
          <button
            onClick={() => handleOpenConfirm('long')}
            className="flex-1 rounded-xl bg-emerald-500/90 py-4 text-lg font-semibold text-black shadow-[0_0_26px_rgba(16,185,129,.6)] transition hover:bg-emerald-400"
          >
            {tr('btn.buyLong', lang)}
          </button>
          <button
            onClick={() => handleOpenConfirm('short')}
            className="flex-1 rounded-xl bg-rose-500/90 py-4 text-lg font-semibold text-black shadow-[0_0_26px_rgba(244,63,94,.6)] transition hover:bg-rose-400"
          >
            {tr('btn.sellShort', lang)}
          </button>
        </div>

        {/* bottom tabs */}
        <div className="mt-4 border-t border-white/10 pt-3 text-sm text-white/70">
          <div className="mb-3 flex gap-6">
            <span className="border-b-2 border-cyan-400 pb-1 text-cyan-200">
              {tr('trade.inTransaction', lang)}
            </span>
            <span className="pb-1 text-white/40">
              {tr('trade.historyTab', lang)}
            </span>
          </div>

          {run && showCountdown ? (
            <div className="text-xs text-white/60">
              Trade running on{' '}
              <span className="text-white">{pairLabel}</span> for{' '}
              <span className="text-cyan-300">
                {Math.round(duration)}s
              </span>{' '}
              — check the countdown modal.
            </div>
          ) : (
            <div className="text-xs text-white/40">
              {tr('trade.noActive', lang)}
            </div>
          )}
        </div>
      </section>

      {/* CONFIRMATION MODAL */}
      <Modal
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setPendingTrade(null);
        }}
        title={tr('confirm.title', lang)}
      >
        {pendingTrade ? (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="mb-2 text-xs uppercase tracking-[0.16em] text-white/50">
                {tr('confirm.summary', lang)}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] text-white/60">
                    {tr('confirm.pair', lang)}
                  </div>
                  <div className="text-sm font-semibold text-white">
                    {pendingTrade.pair.replace('USDT', '/USDT')}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-white/60">
                    {tr('confirm.direction', lang)}
                  </div>
                  <div className="text-sm font-semibold text-white">
                    {pendingTrade.direction === 'long'
                      ? tr('btn.buyLong', lang)
                      : tr('btn.sellShort', lang)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-white/60">
                    {tr('confirm.amount', lang)}
                  </div>
                  <div className="text-sm font-semibold text-white">
                    {pendingTrade.amount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    {mode}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-white/60">
                    {tr('confirm.duration', lang)}
                  </div>
                  <div className="text-sm font-semibold text-white">
                    {pendingTrade.duration} sec
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-cyan-400/25 bg-cyan-400/10 p-3 text-xs text-cyan-100">
              {tr('confirm.estimatedPayout', lang)}{' '}
              <span className="font-semibold">
                {(pendingTrade.amount * 1.8).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                {mode}
              </span>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setConfirmOpen(false);
                  setPendingTrade(null);
                }}
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs text-white/80 hover:border-white/40"
              >
                {tr('confirm.cancel', lang)}
              </button>
              <button
                onClick={startConfirmedTrade}
                className="rounded-xl border border-emerald-400/40 bg-emerald-400/80 px-4 py-2 text-xs font-semibold text-black shadow-[0_0_18px_rgba(34,197,94,0.6)] hover:bg-emerald-300"
              >
                {tr('confirm.submit', lang)}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-white/60">No trade to confirm.</div>
        )}
      </Modal>

      {/* countdown / running trade modal */}
      {run && (
        <CountdownTrade
          open={showCountdown}
          onClose={onCountdownClose}
          pair={run.pair}
          amount={run.amount}
          duration={run.duration}
          direction={run.direction}
          onFinish={onTradeFinish}
        />
      )}

      {/* recent trades under the panel */}
      <div className="mt-10">
        <RecentTrades items={trades} />
      </div>
    </main>
  );
}

function Nav({ to, label }: { to: string; label: string }) {
  const inner = (
    <span className="nav-link inline-block rounded-xl border border-white/10 px-3 py-1 text-white/80 hover:text-white">
      {label}
    </span>
  );

  return to.startsWith('/') ? (
    <Link href={to}>{inner}</Link>
  ) : (
    <a href={to}>{inner}</a>
  );
}
