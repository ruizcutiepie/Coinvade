// src/app/trade/page.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

import AppShell from '../components/AppShell';
import CountdownTrade from '../components/CountdownTrade';
import Modal from '../components/Modal';
import RecentTrades, { TradeResult } from '../components/RecentTrades';
import { useLang, tr } from '../components/useLang';
import WalletBalance from '../components/WalletBalance';

// ✅ single source of truth for payout math
import { DURATION_PROFIT_RATE, getEstimatedPayout, getProfitRate } from '@/lib/payout';

type Direction = 'long' | 'short';

type FinishPayload = {
  pair: string;
  direction: Direction;
  amount: number;
  duration: number;
  ts: number;
};

type ResolveResult = {
  won: boolean | null;
  delta: number;
  exitPrice: number;
};

function fmt(n: number, d = 2) {
  const num = Number(n || 0);
  return num.toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

// ✅ durations are now a UI list only — profit % comes from payout.ts
const DURATIONS = [
  { label: '30 second', seconds: 30 },
  { label: '45 second', seconds: 45 },
  { label: '60 second', seconds: 60 },
  { label: '90 second', seconds: 90 },
  { label: '120 second', seconds: 120 },
  { label: '180 second', seconds: 180 },
  { label: '240 second', seconds: 240 },
  { label: '300 second', seconds: 300 },
];

const PRESETS = [10, 20, 50, 100, 250];

async function safeJson(res: Response) {
  const txt = await res.text();
  try {
    return JSON.parse(txt);
  } catch {
    throw new Error(`Non-JSON response (${res.status}) from ${res.url}`);
  }
}

export default function TradePage() {
  const [trades, setTrades] = useState<TradeResult[]>([]);
  const [tradesLoading, setTradesLoading] = useState(false);

  const [balance, setBalance] = useState<number | null>(null);
  const { lang } = useLang();

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

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingTrade, setPendingTrade] = useState<{
    pair: string;
    amount: number;
    direction: Direction;
    duration: number;
  } | null>(null);

  const [insufficientOpen, setInsufficientOpen] = useState(false);
  const [insufficientMsg, setInsufficientMsg] = useState<string>(
    'Not enough balance for this trade.'
  );

  const [openingTrade, setOpeningTrade] = useState(false);
  const [resolvingTrade, setResolvingTrade] = useState(false);
  const resolveGuardRef = useRef(false);

  const activeTradeIdRef = useRef<string | null>(null);
  const entryPriceRef = useRef<number | null>(null);

  // ✅ use payout lib (single source of truth)
  const profitRate = useMemo(() => getProfitRate(duration), [duration]);

  // ✅ recalculates off (amount, duration) directly
  const estPayout = useMemo(() => {
    return getEstimatedPayout(amount, duration);
  }, [amount, duration]);

  // ✅ show profit explicitly so changes are obvious
  const estProfit = useMemo(() => {
    const s = Number(amount);
    if (!Number.isFinite(s) || s <= 0) return 0;
    return s * profitRate;
  }, [amount, profitRate]);

  const pairLabel = pair.includes('/') ? pair : `${pair.replace('USDT', '')}/USDT`;

  const tradeLocked =
    openingTrade || resolvingTrade || confirmOpen || showCountdown || insufficientOpen;

  const tvSrc = useMemo(() => {
    const symbol = `BINANCE:${pair.replace('/', '').toUpperCase()}`;
    const params = new URLSearchParams({
      symbol,
      interval: '15',
      theme: 'dark',
      style: '1',
      locale: 'en',
      toolbarbg: '#0b1220',
      enable_publishing: 'false',
      allow_symbol_change: 'false',
      hide_top_toolbar: 'false',
      hide_side_toolbar: 'true',
      saveimage: 'false',
      studies: '[]',
    });

    return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
  }, [pair]);

  async function loadWallet() {
    try {
      const res = await fetch('/api/wallet/info', { cache: 'no-store' });
      const j = await safeJson(res);

      if (res.ok && j?.ok && j.wallet) {
        const next = Number(j.wallet.balance ?? 0);
        setBalance(next);

        if (typeof window !== 'undefined') {
          window.localStorage.setItem('coinvade.walletBalance', String(next));
          window.dispatchEvent(
            new CustomEvent('coinvade-wallet-updated', { detail: { balance: next } })
          );
        }
      } else {
        if (balance == null) setBalance(0);
      }
    } catch (err) {
      console.error('[trade] failed to load wallet', err);
      if (balance == null) setBalance(0);
    }
  }

  async function loadTrades() {
    setTradesLoading(true);
    try {
      const res = await fetch('/api/trades?take=50', { cache: 'no-store' });
      const j = await safeJson(res);

      if (!res.ok || !j?.ok) return;

      const items = Array.isArray(j.items) ? (j.items as TradeResult[]) : [];
      const normalized = items.map((t: any) => ({
        ...t,
        direction:
          t.direction === 'long' || t.direction === 'short'
            ? t.direction
            : String(t.direction || '').toLowerCase() === 'short'
            ? 'short'
            : 'long',
        won: t.won ?? null,
      }));

      setTrades(normalized);
    } catch (e) {
      console.error('[trade] loadTrades error', e);
    } finally {
      setTradesLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('coinvade.walletBalance');
      if (stored != null && !Number.isNaN(Number(stored))) {
        const next = Number(stored);
        setBalance(next);
        window.dispatchEvent(
          new CustomEvent('coinvade-wallet-updated', { detail: { balance: next } })
        );
      } else {
        loadWallet();
      }
    } else {
      loadWallet();
    }

    loadTrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openInsufficient(message: string) {
    setConfirmOpen(false);
    setPendingTrade(null);
    setInsufficientMsg(message);
    setInsufficientOpen(true);
  }

  function handleOpenConfirm(nextDirection: Direction) {
    if (tradeLocked) return;

    if (!Number.isFinite(amount) || amount <= 0) {
      openInsufficient('Invalid stake amount. Please enter a valid amount.');
      return;
    }

    // ✅ validate duration using shared table
    if (!Number.isFinite(duration) || duration <= 0 || DURATION_PROFIT_RATE[duration] == null) {
      openInsufficient('Invalid duration. Please select a supported duration.');
      return;
    }

    if (balance == null) {
      openInsufficient('Loading balance… please try again in a moment.');
      return;
    }
    if (amount > balance) {
      openInsufficient('Not enough balance for this trade. Please deposit first.');
      return;
    }

    setPendingTrade({ pair, amount, direction: nextDirection, duration });
    setConfirmOpen(true);
  }

  async function startConfirmedTrade() {
    if (!pendingTrade) return;
    if (openingTrade) return;

    setOpeningTrade(true);

    try {
      const { pair, amount, direction, duration } = pendingTrade;
      const apiDirection = direction === 'long' ? 'LONG' : 'SHORT';

      const res = await fetch('/api/trade/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          pair: pair.replace('/', '').toUpperCase(),
          direction: apiDirection,
          amount,
          duration,
          entryPrice: null,
        }),
      });

      const j = await safeJson(res);

      if (!res.ok || !j?.ok) {
        openInsufficient(j?.error || 'Failed to open trade. Please try again.');
        return;
      }

      activeTradeIdRef.current = String(j.trade?.id || '');
      entryPriceRef.current =
        j.trade?.entryPrice != null ? Number(j.trade.entryPrice) : null;

      if (j.wallet) {
        const nextBalance = Number(j.wallet.balance ?? 0);
        setBalance(nextBalance);

        if (typeof window !== 'undefined') {
          window.localStorage.setItem('coinvade.walletBalance', String(nextBalance));
          window.dispatchEvent(
            new CustomEvent('coinvade-wallet-updated', { detail: { balance: nextBalance } })
          );
        }
      }

      setDirection(direction);
      setRun({ pair, amount, direction, duration });
      setShowCountdown(true);

      setConfirmOpen(false);
      setPendingTrade(null);

      resolveGuardRef.current = false;
    } catch (e: any) {
      console.error('[trade] open trade error', e);
      openInsufficient(e?.message || 'Failed to open trade. Please try again.');
    } finally {
      setOpeningTrade(false);
    }
  }

  function onCountdownClose() {
    setShowCountdown(false);
    setRun(null);

    activeTradeIdRef.current = null;
    entryPriceRef.current = null;
    resolveGuardRef.current = false;
  }

  async function onTradeFinish(res: FinishPayload): Promise<ResolveResult | void> {
    if (resolveGuardRef.current) return;
    resolveGuardRef.current = true;

    setResolvingTrade(true);

    try {
      const tradeId = activeTradeIdRef.current;
      if (!tradeId) {
        openInsufficient('Trade is missing an ID. Please refresh and try again.');
        return;
      }

      const response = await fetch('/api/trade/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ tradeId }),
      });

      const j = await safeJson(response);

      if (!response.ok || !j?.ok) {
        openInsufficient(j?.error || 'Failed to resolve trade. Please try again.');
        return;
      }

      const serverTrade = j.trade;
      const serverWallet = j.wallet;

      const stake = Number(serverTrade.amount ?? res.amount) || 0;
      const won = (serverTrade.won ?? null) as boolean | null;
      const payout = Number(serverTrade.payout ?? 0) || 0;
      const exitPrice = Number(serverTrade.exitPrice ?? serverTrade.closePrice ?? 0) || 0;

      // ✅ use shared rate getter
      const r = getProfitRate(Number(serverTrade.duration ?? res.duration));

      let delta = 0;
      if (won === true) delta = stake * r;
      else if (won === false) delta = -stake;
      else delta = 0;

      const record: TradeResult = {
        id: String(serverTrade.id),
        ts: Date.now(),
        pair: String(serverTrade.pair || res.pair),
        direction: (String(serverTrade.direction || '').toLowerCase() === 'short'
          ? 'short'
          : 'long') as any,
        amount: stake,
        duration: Number(serverTrade.duration || res.duration),
        entryPrice: Number(serverTrade.entryPrice || entryPriceRef.current || 0),
        exitPrice: Number(serverTrade.exitPrice || 0),
        won,
        payout,
      };

      setTrades((prev) => [record, ...prev].slice(0, 50));

      if (serverWallet) {
        const nextBalance = Number(serverWallet.balance ?? 0);
        setBalance(nextBalance);

        if (typeof window !== 'undefined') {
          window.localStorage.setItem('coinvade.walletBalance', String(nextBalance));
          window.dispatchEvent(
            new CustomEvent('coinvade-wallet-updated', { detail: { balance: nextBalance } })
          );
        }
      } else {
        loadWallet();
      }

      loadTrades();
      return { won, delta, exitPrice };
    } catch (err: any) {
      console.error('[trade] onTradeFinish error', err);
      openInsufficient(err?.message || 'Unexpected error while resolving trade.');
      return;
    } finally {
      setResolvingTrade(false);
    }
  }

  return (
    <AppShell title="Trade">
      <div className="mb-5 flex justify-end">
        <WalletBalance />
      </div>

      <section className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-black/40 p-5 shadow-[0_0_40px_rgba(0,0,0,.6)]">
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-white">Market (Candlestick)</div>
            <Link href="/markets" className="text-xs text-white/60 hover:text-white/90">
              View Markets →
            </Link>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3 text-xs text-white/60">
              <div>
                Active Pair: <span className="text-cyan-200 font-semibold">{pairLabel}</span>
              </div>
              <div>Zoom with mouse wheel / pinch</div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/70">
              <iframe
                key={pair}
                src={tvSrc}
                className="h-[420px] w-full"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                title={`chart-${pair}`}
              />
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          {DURATIONS.map((d) => (
            <button
              key={d.seconds}
              onClick={() => !tradeLocked && setDuration(d.seconds)}
              disabled={tradeLocked}
              className={`min-w-[120px] rounded-xl border px-4 py-2 text-left text-xs transition ${
                duration === d.seconds
                  ? 'border-cyan-400/60 bg-cyan-500/20 shadow-[0_0_14px_rgba(0,224,255,.45)]'
                  : 'border-white/10 bg-black/40 hover:border-white/40'
              } ${tradeLocked ? 'cursor-not-allowed opacity-60 hover:border-white/10' : ''}`}
            >
              <div className="text-sm font-semibold text-white">{d.label}</div>
              <div className="mt-1 text-[11px] text-white/60">
                {tr('trade.profitRate', lang)}{' '}
                <span className="ml-1 text-cyan-300">
                  {Math.round(getProfitRate(d.seconds) * 100)}%
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="mb-4 text-sm text-white/60">{tr('trade.transactionMode', lang)}</div>
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => !tradeLocked && setMode('USDT')}
            disabled={tradeLocked}
            className={`min-w-[120px] rounded-xl border px-4 py-2 text-sm transition ${
              mode === 'USDT'
                ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-100'
                : 'border-white/10 bg-black/40 text-white/70 hover:border-white/40'
            } ${tradeLocked ? 'cursor-not-allowed opacity-60 hover:border-white/10' : ''}`}
          >
            USDT
          </button>
          <button
            onClick={() => !tradeLocked && setMode('SNX')}
            disabled={tradeLocked}
            className={`min-w-[120px] rounded-xl border px-4 py-2 text-sm transition ${
              mode === 'SNX'
                ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-100'
                : 'border-white/10 bg-black/40 text-white/70 hover:border-white/40'
            } ${tradeLocked ? 'cursor-not-allowed opacity-60 hover:border-white/10' : ''}`}
          >
            SNX
          </button>
        </div>

        <div className="mb-4 max-w-xs">
          <label className="mb-1 block text-xs text-white/60">Trading pair</label>
          <select
            className={`w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none ${
              tradeLocked ? 'cursor-not-allowed opacity-60' : ''
            }`}
            value={pair}
            disabled={tradeLocked}
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

        <div className="mb-2 text-sm text-white/60">{tr('trade.openingQty', lang)}</div>
        <div className="mb-4">
          <input
            type="number"
            min={1}
            inputMode="decimal"
            value={Number.isFinite(amount) ? amount : ''}
            disabled={tradeLocked}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
            className={`block w-full rounded-xl border border-white/15 bg-black/60 px-4 py-3 text-lg outline-none ${
              tradeLocked ? 'cursor-not-allowed opacity-60' : ''
            }`}
            placeholder="0"
          />

          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {PRESETS.map((v) => (
              <button
                key={v}
                onClick={() => !tradeLocked && setAmount(v)}
                disabled={tradeLocked}
                className={`rounded-xl border px-3 py-1 transition ${
                  amount === v
                    ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-100'
                    : 'border-white/10 bg-black/40 text-white/70 hover:border-white/30'
                } ${tradeLocked ? 'cursor-not-allowed opacity-60 hover:border-white/10' : ''}`}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="mt-2 space-y-1 text-[11px] text-white/60">
            <div>
              Estimated profit:{' '}
              <span className="text-cyan-300">
                +{fmt(estProfit)} {mode} ({Math.round(profitRate * 100)}%)
              </span>
            </div>
            <div>
              Estimated payout:{' '}
              <span className="text-cyan-300">
                {fmt(estPayout)} {mode}
              </span>
            </div>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between text-xs text-white/50">
          <span>{tr('trade.accountLabel', lang)}</span>
          <span>
            {balance != null ? fmt(balance, 2) : '—'} {mode}
          </span>
        </div>

        <div className="mb-4 flex gap-3">
          <button
            onClick={() => handleOpenConfirm('long')}
            disabled={tradeLocked}
            className={`flex-1 rounded-xl bg-emerald-500/90 py-4 text-lg font-semibold text-black shadow-[0_0_26px_rgba(16,185,129,.6)] transition hover:bg-emerald-400 ${
              tradeLocked ? 'cursor-not-allowed opacity-60 hover:bg-emerald-500/90' : ''
            }`}
          >
            {openingTrade ? 'Opening…' : tr('btn.buyLong', lang)}
          </button>
          <button
            onClick={() => handleOpenConfirm('short')}
            disabled={tradeLocked}
            className={`flex-1 rounded-xl bg-rose-500/90 py-4 text-lg font-semibold text-black shadow-[0_0_26px_rgba(244,63,94,.6)] transition hover:bg-rose-400 ${
              tradeLocked ? 'cursor-not-allowed opacity-60 hover:bg-rose-500/90' : ''
            }`}
          >
            {openingTrade ? 'Opening…' : tr('btn.sellShort', lang)}
          </button>
        </div>

        <div className="mt-4 border-t border-white/10 pt-3 text-sm text-white/70">
          <div className="mb-3 flex gap-6">
            <span className="border-b-2 border-cyan-400 pb-1 text-cyan-200">
              {tr('trade.inTransaction', lang)}
            </span>
            <span className="pb-1 text-white/40">{tr('trade.historyTab', lang)}</span>
          </div>

          {run && showCountdown ? (
            <div className="text-xs text-white/60">
              Trade running on <span className="text-white">{pairLabel}</span> for{' '}
              <span className="text-cyan-300">{Math.round(duration)}s</span> — check the countdown
              modal.
            </div>
          ) : resolvingTrade ? (
            <div className="text-xs text-white/60">Resolving trade… please wait.</div>
          ) : (
            <div className="text-xs text-white/40">{tr('trade.noActive', lang)}</div>
          )}
        </div>
      </section>

      <Modal
        open={confirmOpen}
        onClose={() => {
          if (openingTrade) return;
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
                  <div className="text-[11px] text-white/60">{tr('confirm.pair', lang)}</div>
                  <div className="text-sm font-semibold text-white">
                    {pendingTrade.pair.replace('USDT', '/USDT')}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-white/60">{tr('confirm.direction', lang)}</div>
                  <div className="text-sm font-semibold text-white">
                    {pendingTrade.direction === 'long'
                      ? tr('btn.buyLong', lang)
                      : tr('btn.sellShort', lang)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-white/60">{tr('confirm.amount', lang)}</div>
                  <div className="text-sm font-semibold text-white">
                    {pendingTrade.amount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    {mode}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-white/60">{tr('confirm.duration', lang)}</div>
                  <div className="text-sm font-semibold text-white">{pendingTrade.duration} sec</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-cyan-400/25 bg-cyan-400/10 p-3 text-xs text-cyan-100">
              {tr('confirm.estimatedPayout', lang)}{' '}
              <span className="font-semibold">
                {getEstimatedPayout(pendingTrade.amount, pendingTrade.duration).toLocaleString(
                  undefined,
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}{' '}
                {mode}
              </span>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                disabled={openingTrade}
                onClick={() => {
                  if (openingTrade) return;
                  setConfirmOpen(false);
                  setPendingTrade(null);
                }}
                className={`rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs text-white/80 hover:border-white/40 ${
                  openingTrade ? 'cursor-not-allowed opacity-60 hover:border-white/20' : ''
                }`}
              >
                {tr('confirm.cancel', lang)}
              </button>
              <button
                onClick={startConfirmedTrade}
                disabled={openingTrade}
                className={`rounded-xl border border-emerald-400/40 bg-emerald-400/80 px-4 py-2 text-xs font-semibold text-black shadow-[0_0_18px_rgba(34,197,94,0.6)] hover:bg-emerald-300 ${
                  openingTrade ? 'cursor-not-allowed opacity-60 hover:bg-emerald-400/80' : ''
                }`}
              >
                {openingTrade ? 'Submitting…' : tr('confirm.submit', lang)}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-white/60">No trade to confirm.</div>
        )}
      </Modal>

      <Modal open={insufficientOpen} onClose={() => setInsufficientOpen(false)} title="Notice">
        <div className="space-y-4 text-sm">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-white/80">
            {insufficientMsg}
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setInsufficientOpen(false)}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs text-white/80 hover:border-white/40"
            >
              Close
            </button>
            <Link
              href="/wallet"
              className="rounded-xl border border-cyan-400/40 bg-cyan-400/80 px-4 py-2 text-xs font-semibold text-black shadow-[0_0_18px_rgba(34,211,238,.6)] hover:bg-cyan-300"
              onClick={() => setInsufficientOpen(false)}
            >
              Go to Wallet
            </Link>
          </div>
        </div>
      </Modal>

      {run && (
        <CountdownTrade
          open={showCountdown}
          onClose={onCountdownClose}
          pair={run.pair}
          amount={run.amount}
          duration={run.duration}
          direction={run.direction}
          tradeId={activeTradeIdRef.current}
          entryPrice={entryPriceRef.current}
          onFinish={onTradeFinish}
        />
      )}

      <div className="mt-10">
        {tradesLoading ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-black/20 p-6 text-white/70">
            Loading trade history…
          </div>
        ) : (
          <RecentTrades items={trades} />
        )}
      </div>
    </AppShell>
  );
}