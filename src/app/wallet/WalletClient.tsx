'use client';

import React, { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import CoinIcon from '../components/CoinIcon';
import { useLang, tr } from '../components/useLang';

type Coin =
  | 'BTC'
  | 'ETH'
  | 'SOL'
  | 'XRP'
  | 'ADA'
  | 'BNB'
  | 'DOGE'
  | 'DOT'
  | 'USDT';

type WalletState = Record<Coin, number>;

type PriceMap = Record<Coin, number>;

type Tab = 'overview' | 'deposit' | 'withdraw';

function fmt(n: number, d = 2) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

const SUPPORTED_COINS: Coin[] = [
  'BTC',
  'ETH',
  'SOL',
  'XRP',
  'ADA',
  'BNB',
  'DOGE',
  'DOT',
  'USDT',
];

export default function WalletClient() {
  const { lang } = useLang();

  const [tab, setTab] = useState<Tab>('overview');

  // Your wallet balances (whatever you already use)
  const [wallet, setWallet] = useState<WalletState>({
    BTC: 0,
    ETH: 0,
    SOL: 0,
    XRP: 0,
    ADA: 0,
    BNB: 0,
    DOGE: 0,
    DOT: 0,
    USDT: 0,
  });

  // Prices (server-fetched)
  const [prices, setPrices] = useState<PriceMap>({
    BTC: 0,
    ETH: 0,
    SOL: 0,
    XRP: 0,
    ADA: 0,
    BNB: 0,
    DOGE: 0,
    DOT: 0,
    USDT: 1,
  });

  const [pricesOk, setPricesOk] = useState(true);

  // ------------------------------------------------------------------
  // LOAD PRICES (IMPORTANT: from /api/prices so it works on Vercel)
  // ------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadPrices() {
      try {
        const res = await fetch('/api/prices', { cache: 'no-store' });
        const data = await res.json();

        if (!res.ok || data?.error || !data?.prices) throw new Error('bad');

        if (cancelled) return;

        const p = data.prices as Record<string, number>;

        setPrices({
          BTC: Number(p.BTC ?? 0),
          ETH: Number(p.ETH ?? 0),
          SOL: Number(p.SOL ?? 0),
          XRP: Number(p.XRP ?? 0),
          ADA: Number(p.ADA ?? 0),
          BNB: Number(p.BNB ?? 0),
          DOGE: Number(p.DOGE ?? 0),
          DOT: Number(p.DOT ?? 0),
          USDT: 1,
        });

        setPricesOk(true);
      } catch {
        if (!cancelled) setPricesOk(false);
      }
    }

    loadPrices();
    const t = setInterval(loadPrices, 20_000); // refresh
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  // ------------------------------------------------------------------
  // TABLE ROWS
  // ------------------------------------------------------------------
  const rows = useMemo(() => {
    return SUPPORTED_COINS.map((coin) => {
      const bal = wallet[coin] ?? 0;
      const price = prices[coin] ?? (coin === 'USDT' ? 1 : 0);
      const value = coin === 'USDT' ? bal : bal * price;

      return {
        coin,
        balance: bal,
        price,
        value,
      };
    });
  }, [wallet, prices]);

  const totalValue = useMemo(() => {
    return rows.reduce((sum, r) => sum + r.value, 0);
  }, [rows]);

  // ------------------------------------------------------------------
  // CONVERT UI (simple example – keep your existing logic if you have it)
  // ------------------------------------------------------------------
  const [fromCoin, setFromCoin] = useState<Coin>('BTC');
  const [toCoin, setToCoin] = useState<Coin>('USDT');
  const [amount, setAmount] = useState('');

  const fromPrice = prices[fromCoin] ?? (fromCoin === 'USDT' ? 1 : 0);
  const toPrice = prices[toCoin] ?? (toCoin === 'USDT' ? 1 : 0);

  const rate =
    fromPrice && toPrice ? fromPrice / toPrice : 0;

  // ------------------------------------------------------------------
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 pb-14 pt-8 text-white">
        {/* Tabs */}
        <div className="mx-auto mb-8 flex max-w-xl justify-center gap-4">
          <button
            onClick={() => setTab('overview')}
            className={`rounded-full px-6 py-2 text-sm ${
              tab === 'overview'
                ? 'bg-cyan-500 text-black shadow-[0_0_22px_rgba(0,255,255,.45)]'
                : 'border border-white/10 bg-white/5 text-white/80'
            }`}
          >
            Overview &amp; Convert
          </button>

          <button
            onClick={() => setTab('deposit')}
            className={`rounded-full px-6 py-2 text-sm ${
              tab === 'deposit'
                ? 'bg-cyan-500 text-black shadow-[0_0_22px_rgba(0,255,255,.45)]'
                : 'border border-white/10 bg-white/5 text-white/80'
            }`}
          >
            Deposit
          </button>

          <button
            onClick={() => setTab('withdraw')}
            className={`rounded-full px-6 py-2 text-sm ${
              tab === 'withdraw'}
                ? 'bg-cyan-500 text-black shadow-[0_0_22px_rgba(0,255,255,.45)]'
                : 'border border-white/10 bg-white/5 text-white/80'
            }`}
          >
            Withdraw
          </button>
        </div>

        {tab === 'overview' && (
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Wallet Overview */}
            <div className="rounded-3xl border border-white/10 bg-black/40 p-7 shadow-[0_0_50px_rgba(0,0,0,0.55)]">
              <h2 className="text-2xl font-semibold">Wallet Overview</h2>

              <div className="mt-3 text-sm text-white/70">
                Estimated total value:{' '}
                <span className="font-semibold text-cyan-300">
                  {fmt(totalValue)} USDT
                </span>
              </div>

              {/* NOTE: no more scary red error */}
              {!pricesOk && (
                <div className="mt-2 text-xs text-white/40">
                  Prices temporarily unavailable — showing “--”.
                </div>
              )}

              <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 text-white/55">
                    <tr>
                      <th className="px-4 py-3 text-left tracking-widest">ASSET</th>
                      <th className="px-4 py-3 text-right tracking-widest">BALANCE</th>
                      <th className="px-4 py-3 text-right tracking-widest">PRICE (USDT)</th>
                      <th className="px-4 py-3 text-right tracking-widest">VALUE (USDT)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.coin} className="border-t border-white/5">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <CoinIcon coin={r.coin} size={18} />
                            <span className="font-semibold">{r.coin}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-white/90">
                          {fmt(r.balance, 6)}
                        </td>
                        <td className="px-4 py-3 text-right text-white/90">
                          {r.coin === 'USDT'
                            ? '1.00'
                            : pricesOk && r.price
                            ? fmt(r.price, 4)
                            : '--'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-white">
                          {pricesOk ? fmt(r.value, 2) : '0.00'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Convert */}
            <div className="rounded-3xl border border-white/10 bg-black/40 p-7 shadow-[0_0_50px_rgba(0,0,0,0.55)]">
              <h2 className="text-2xl font-semibold">Convert</h2>
              <p className="mt-2 text-sm text-white/60">
                Convert between supported assets using live market prices.
              </p>

              <div className="mt-6 space-y-5">
                <div>
                  <div className="mb-2 text-xs text-white/60">From</div>
                  <div className="flex gap-3">
                    <select
                      value={fromCoin}
                      onChange={(e) => setFromCoin(e.target.value as Coin)}
                      className="w-44 rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm outline-none"
                    >
                      {SUPPORTED_COINS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>

                    <input
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Amount"
                      className="flex-1 rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm outline-none"
                    />
                  </div>

                  <div className="mt-2 text-xs text-white/50">
                    Available: {fmt(wallet[fromCoin] ?? 0, 6)} {fromCoin}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-xs text-white/60">To</div>
                  <select
                    value={toCoin}
                    onChange={(e) => setToCoin(e.target.value as Coin)}
                    className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm outline-none"
                  >
                    {SUPPORTED_COINS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-white/80">
                  {pricesOk && rate
                    ? `1 ${fromCoin} ≈ ${fmt(rate, 6)} ${toCoin}`
                    : `Prices unavailable`}
                </div>

                <button className="w-full rounded-2xl bg-cyan-500 py-4 font-semibold text-black shadow-[0_0_30px_rgba(0,255,255,.35)]">
                  Convert now
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'deposit' && (
          <div className="rounded-3xl border border-white/10 bg-black/40 p-7">
            <h2 className="text-2xl font-semibold">Deposit</h2>
            <p className="mt-2 text-sm text-white/60">
              Deposit UI here…
            </p>
          </div>
        )}

        {tab === 'withdraw' && (
          <div className="rounded-3xl border border-white/10 bg-black/40 p-7">
            <h2 className="text-2xl font-semibold">Withdraw</h2>
            <p className="mt-2 text-sm text-white/60">
              Withdraw UI here…
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
