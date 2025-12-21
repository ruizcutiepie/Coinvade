// src/app/wallet/WalletClient.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import CoinIcon from '../components/CoinIcon';
import useLocalNumber from '../components/useLocalNumber';
import useLocalJson from '../components/useLocalJson';
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

type WalletState = {
  BTC: number;
  ETH: number;
  SOL: number;
  XRP: number;
  ADA: number;
  BNB: number;
  DOGE: number;
  DOT: number;
};

type PriceMap = Record<Coin, number>;
type Tab = 'overview' | 'deposit' | 'withdraw';

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

function fmt(n: number, d = 2) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

function num(x: any): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

export default function WalletClient() {
  const { lang } = useLang();

  // ✅ USDT stored separately via useLocalNumber (THIS is the correct usage)
  const [usdtBalance] = useLocalNumber('coinvade.usdt', 0);

  // crypto balances stored in local json
  const [wallet] = useLocalJson<WalletState>('coinvade.wallet', {
    BTC: 0,
    ETH: 0,
    SOL: 0,
    XRP: 0,
    ADA: 0,
    BNB: 0,
    DOGE: 0,
    DOT: 0,
  });

  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const [prices, setPrices] = useState<PriceMap>(() => ({
    BTC: 0,
    ETH: 0,
    SOL: 0,
    XRP: 0,
    ADA: 0,
    BNB: 0,
    DOGE: 0,
    DOT: 0,
    USDT: 1,
  }));

  // ✅ no more red error, we use a soft status instead
  const [priceStatus, setPriceStatus] = useState<'loading' | 'ok' | 'degraded'>(
    'loading'
  );

  const rows = useMemo(() => {
    return SUPPORTED_COINS.map((coin) => {
      const balance =
        coin === 'USDT' ? usdtBalance : wallet[coin as keyof WalletState] ?? 0;

      const price = prices[coin] ?? (coin === 'USDT' ? 1 : 0);

      // show value even if price missing (it will be 0 if price is 0)
      const value = coin === 'USDT' ? balance : balance * (price || 0);

      return { coin, balance, price, value };
    });
  }, [wallet, prices, usdtBalance]);

  const totalValue = useMemo(() => {
    return rows.reduce(
      (sum, r) => sum + (Number.isFinite(r.value) ? r.value : 0),
      0
    );
  }, [rows]);

  // ✅ fetch prices safely
  useEffect(() => {
    let dead = false;

    async function loadPrices() {
      try {
        setPriceStatus('loading');

        const next: PriceMap = {
          BTC: 0,
          ETH: 0,
          SOL: 0,
          XRP: 0,
          ADA: 0,
          BNB: 0,
          DOGE: 0,
          DOT: 0,
          USDT: 1,
        };

        const tasks = SUPPORTED_COINS.filter((c) => c !== 'USDT').map(
          async (c) => {
            const symbol = `${c}USDT`;

            // ✅ If your endpoint name differs, change only this URL
            const res = await fetch(
              `/api/price?symbol=${encodeURIComponent(symbol)}`,
              { cache: 'no-store' }
            );

            const data = await res.json().catch(() => ({}));

            const p =
              num(data?.price) ??
              num(data?.lastPrice) ??
              num(data?.data?.price) ??
              num(data?.data?.lastPrice);

            if (p != null) next[c] = p;
          }
        );

        await Promise.allSettled(tasks);

        if (dead) return;

        const gotAny = Object.entries(next)
          .filter(([k]) => k !== 'USDT')
          .some(([, v]) => v && v > 0);

        setPrices(next);
        setPriceStatus(gotAny ? 'ok' : 'degraded');
      } catch {
        if (dead) return;
        setPriceStatus('degraded');
      }
    }

    loadPrices();
    const t = setInterval(loadPrices, 10000);

    return () => {
      dead = true;
      clearInterval(t);
    };
  }, []);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-6 pb-16 pt-6 text-white">
        <div className="mb-8 flex items-center justify-center gap-3">
          <button
            onClick={() => setActiveTab('overview')}
            className={`rounded-full px-5 py-2 text-sm ${
              activeTab === 'overview'
                ? 'bg-cyan-500 text-black shadow-[0_0_18px_rgba(0,255,255,.35)]'
                : 'border border-white/10 bg-white/5 text-white/80'
            }`}
          >
            Overview &amp; Convert
          </button>
          <button
            onClick={() => setActiveTab('deposit')}
            className={`rounded-full px-5 py-2 text-sm ${
              activeTab === 'deposit'
                ? 'bg-cyan-500 text-black shadow-[0_0_18px_rgba(0,255,255,.35)]'
                : 'border border-white/10 bg-white/5 text-white/80'
            }`}
          >
            Deposit
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`rounded-full px-5 py-2 text-sm ${
              activeTab === 'withdraw'
                ? 'bg-cyan-500 text-black shadow-[0_0_18px_rgba(0,255,255,.35)]'
                : 'border border-white/10 bg-white/5 text-white/80'
            }`}
          >
            Withdraw
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-[0_0_30px_rgba(0,0,0,0.35)]">
              <div className="text-2xl font-semibold">Wallet Overview</div>
              <div className="mt-2 text-sm text-white/60">
                Estimated total value:{' '}
                <span className="text-cyan-300 font-semibold">
                  {fmt(totalValue, 2)} USDT
                </span>
              </div>

              {/* ✅ no red error */}
              {priceStatus === 'degraded' && (
                <div className="mt-2 text-xs text-white/45">
                  Prices temporarily unavailable. Showing “—” until the feed
                  recovers.
                </div>
              )}

              <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 text-white/55">
                    <tr>
                      <th className="px-4 py-3 text-left">ASSET</th>
                      <th className="px-4 py-3 text-right">BALANCE</th>
                      <th className="px-4 py-3 text-right">PRICE (USDT)</th>
                      <th className="px-4 py-3 text-right">VALUE (USDT)</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((r) => {
                      const priceOk =
                        r.coin === 'USDT' || (r.price != null && r.price > 0);

                      return (
                        <tr key={r.coin} className="border-t border-white/5">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5">
                                <CoinIcon coin={r.coin} size={18} />
                              </span>
                              <span className="font-semibold">{r.coin}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-right text-white/90">
                            {fmt(r.balance, r.coin === 'USDT' ? 2 : 6)}
                          </td>

                          <td className="px-4 py-3 text-right text-white/80">
                            {priceOk ? fmt(r.price, r.price < 10 ? 4 : 2) : '—'}
                          </td>

                          <td className="px-4 py-3 text-right text-white/90">
                            {fmt(r.value, 2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 text-xs text-white/40">
                {tr('wallet.note', lang) ||
                  'If price feed fails, we show placeholders and keep the UI stable.'}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-[0_0_30px_rgba(0,0,0,0.35)]">
              <div className="text-2xl font-semibold">Convert</div>
              <div className="mt-2 text-sm text-white/60">
                Convert between supported assets using live market prices.
              </div>

              <button
                disabled={priceStatus !== 'ok'}
                className={`mt-6 w-full rounded-2xl px-5 py-4 font-semibold ${
                  priceStatus === 'ok'
                    ? 'bg-cyan-500 text-black shadow-[0_0_18px_rgba(0,255,255,.3)]'
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                }`}
              >
                Convert now
              </button>
            </div>
          </div>
        )}

        {activeTab === 'deposit' && (
          <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
            <div className="text-xl font-semibold">Deposit</div>
            <div className="mt-2 text-white/60 text-sm">Deposit UI here.</div>
          </div>
        )}

        {activeTab === 'withdraw' && (
          <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
            <div className="text-xl font-semibold">Withdraw</div>
            <div className="mt-2 text-white/60 text-sm">Withdraw UI here.</div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
