// src/app/wallet/page.tsx
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
  | 'USDT'
  | 'USDC';

type WalletState = {
  BTC: number;
  ETH: number;
  SOL: number;
  XRP: number;
  ADA: number;
  BNB: number;
  DOGE: number;
  DOT: number;
  USDC?: number;
};

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

type DepositOption = {
  id: string;
  label: string;
  coin: 'BTC' | 'ETH' | 'USDT' | 'USDC';
  networkLabel: string;
  address: string;
  qr: string; // path in /public
  description: string;
};

const DEPOSIT_OPTIONS: DepositOption[] = [
  {
    id: 'BTC-Bitcoin',
    label: 'BTC-Bitcoin',
    coin: 'BTC',
    networkLabel: 'Bitcoin mainnet',
    address: 'bc1qyfd3hv3hdvrdqgj6k6n98fz704uxfc4zsh0x3w',
    qr: '/deposit/btcbitcoin.jpeg',
    description: 'Send only BTC (Bitcoin network) to this address.',
  },
  {
    id: 'ETH-ERC20',
    label: 'ETH-ERC20',
    coin: 'ETH',
    networkLabel: 'Ethereum (ERC20)',
    address: '0x938e129977943edbb568DfDdCdF5332D74D01B3a',
    qr: '/deposit/etherc20.jpeg',
    description: 'Send only ETH via Ethereum ERC20 network.',
  },
  {
    id: 'USDT-TRC20',
    label: 'USDT-TRC20',
    coin: 'USDT',
    networkLabel: 'TRON (TRC20)',
    address: 'TB9Jxca4JG1JqWp4bUJo9LumXFTFC3cLtX',
    qr: '/deposit/usdttrc20.jpeg',
    description: 'Send only USDT on TRC20 (TRON) to this address.',
  },
  {
    id: 'USDC-ERC20',
    label: 'USDC-ERC20',
    coin: 'USDC',
    networkLabel: 'Ethereum (ERC20)',
    address: '0x0000000000000000000000000000000000000000',
    qr: '/deposit/usdcerc20.jpeg',
    description: 'Send only USDC via Ethereum ERC20 network.',
  },
];

type WithdrawChannel = {
  id: string;
  label: string;
  coin: 'BTC' | 'ETH' | 'USDT';
  networkLabel: string;
};

const WITHDRAW_CHANNELS: WithdrawChannel[] = [
  { id: 'BTC-Bitcoin', label: 'BTC-Bitcoin', coin: 'BTC', networkLabel: 'Bitcoin mainnet' },
  { id: 'ETH-ERC20', label: 'ETH-ERC20', coin: 'ETH', networkLabel: 'Ethereum (ERC20)' },
  { id: 'USDT-TRC20', label: 'USDT-TRC20', coin: 'USDT', networkLabel: 'TRON (TRC20)' },
];

const PARTNER_CHANNELS = [
  { name: 'BANXA', url: '#', caption: 'Official cooperative recharge channel' },
  { name: 'Binance', url: 'https://www.binance.com', caption: 'Official cooperative recharge channel' },
  { name: 'coinbase', url: 'https://www.coinbase.com', caption: 'Official cooperative recharge channel' },
  { name: 'crypto.com', url: 'https://crypto.com', caption: 'Official cooperative recharge channel' },
  { name: 'Kraken', url: 'https://www.kraken.com', caption: 'Official cooperative recharge channel' },
];

export default function WalletPage() {
  const [balance, setBalance] = useLocalNumber('coinvade.balance', 0);

  const [wallet, setWallet] = useLocalJson<WalletState>('coinvade.wallet', {
    BTC: 0,
    ETH: 0,
    SOL: 0,
    XRP: 0,
    ADA: 0,
    BNB: 0,
    DOGE: 0,
    DOT: 0,
    USDC: 0,
  });

  const { lang } = useLang();

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
    USDC: 1,
  });
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  const [fromCoin, setFromCoin] = useState<Coin>('BTC');
  const [toCoin, setToCoin] = useState<Coin>('USDT');
  const [amountStr, setAmountStr] = useState('');
  const [convertLoading, setConvertLoading] = useState(false);

  const [tab, setTab] = useState<Tab>('overview');

  const [selectedDepositId, setSelectedDepositId] = useState<string>(
    DEPOSIT_OPTIONS[0]?.id
  );

  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const [withdrawChannelId, setWithdrawChannelId] = useState<string>(
    WITHDRAW_CHANNELS[0].id
  );
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawAmountStr, setWithdrawAmountStr] = useState('');
  const [withdrawNote, setWithdrawNote] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadUSDTBalance() {
      try {
        const res = await fetch('/api/wallet', { cache: 'no-store' });

        if (res.status === 401) {
          if (!cancelled) setBalance(0);
          return;
        }

        const j = await res.json();
        const next = Number(j?.balance ?? 0);

        if (!cancelled) {
          const safe = Number.isFinite(next) ? next : 0;
          setBalance(safe);

          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('coinvade-wallet-updated', {
                detail: { balance: safe },
              })
            );
          }
        }
      } catch (e) {
        console.error('[wallet/page] failed to load /api/wallet', e);
      }
    }

    loadUSDTBalance();
    return () => {
      cancelled = true;
    };
  }, [setBalance]);

  async function loadPrices() {
    try {
      setPriceLoading(true);
      setPriceError(null);

      const coinsToFetch: Coin[] = [
        'BTC',
        'ETH',
        'SOL',
        'XRP',
        'ADA',
        'BNB',
        'DOGE',
        'DOT',
      ];

      const results = await Promise.all(
        coinsToFetch.map(async (c) => {
          const res = await fetch(`/api/price?symbol=${c}USDT`, { cache: 'no-store' });
          const data = await res.json();
          if (!res.ok || !data?.price) throw new Error(`Failed to fetch ${c} price`);
          return { coin: c, price: Number(data.price) };
        })
      );

      setPrices((prev) => {
        const next: PriceMap = { ...prev, USDT: 1, USDC: 1 };
        for (const r of results) next[r.coin] = r.price;
        return next;
      });
    } catch (e) {
      console.error(e);
      setPriceError('Failed to load prices. Conversion may be unavailable.');
    } finally {
      setPriceLoading(false);
    }
  }

  useEffect(() => {
    loadPrices();
    const id = setInterval(loadPrices, 20000);
    return () => clearInterval(id);
  }, []);

  function getCoinBalance(coin: Coin): number {
    if (coin === 'USDT') return balance;
    return (wallet as any)[coin] ?? 0;
  }

  function setCoinBalance(coin: Coin, value: number) {
    if (!Number.isFinite(value)) return;

    if (coin === 'USDT') {
      const next = Math.max(0, value);
      setBalance(next);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('coinvade-wallet-updated', { detail: { balance: next } })
        );
      }
      return;
    }

    setWallet((prev) => ({
      ...prev,
      [coin]: Math.max(0, value),
    }));
  }

  const totalValueUSDT = useMemo(() => {
    let total = balance;
    total += (wallet.BTC ?? 0) * (prices.BTC || 0);
    total += (wallet.ETH ?? 0) * (prices.ETH || 0);
    total += (wallet.SOL ?? 0) * (prices.SOL || 0);
    total += (wallet.XRP ?? 0) * (prices.XRP || 0);
    total += (wallet.ADA ?? 0) * (prices.ADA || 0);
    total += (wallet.BNB ?? 0) * (prices.BNB || 0);
    total += (wallet.DOGE ?? 0) * (prices.DOGE || 0);
    total += (wallet.DOT ?? 0) * (prices.DOT || 0);
    return total;
  }, [balance, wallet, prices]);

  async function handleConvert(e: React.FormEvent) {
    e.preventDefault();
    const raw = amountStr.trim();
    const amt = Number(raw);

    if (!raw || !Number.isFinite(amt) || amt <= 0) {
      alert('Enter a valid amount to convert.');
      return;
    }

    if (fromCoin === toCoin) {
      alert('From and To assets must be different.');
      return;
    }

    const fromBal = getCoinBalance(fromCoin);
    if (amt > fromBal) {
      alert(`Insufficient ${fromCoin} balance.`);
      return;
    }

    const fromPrice = prices[fromCoin];
    const toPrice = prices[toCoin];

    if (!fromPrice || !toPrice) {
      alert('Prices not available yet. Please wait a moment.');
      return;
    }

    const valueUSDT = amt * fromPrice;
    const received = valueUSDT / toPrice;

    setConvertLoading(true);
    try {
      setCoinBalance(fromCoin, fromBal - amt);
      const toBal = getCoinBalance(toCoin);
      setCoinBalance(toCoin, toBal + received);

      setAmountStr('');
      alert(`Converted ${amt} ${fromCoin} → ${received.toFixed(6)} ${toCoin}`);
    } finally {
      setConvertLoading(false);
    }
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();

    const channel = WITHDRAW_CHANNELS.find((c) => c.id === withdrawChannelId);
    if (!channel) {
      alert('Please select a withdrawal channel.');
      return;
    }

    const rawAmount = withdrawAmountStr.trim();
    const amount = Number(rawAmount);

    if (!withdrawAddress.trim()) {
      alert('Please enter your wallet address.');
      return;
    }
    if (!rawAmount || !Number.isFinite(amount) || amount <= 0) {
      alert('Enter a valid amount.');
      return;
    }

    const bal = getCoinBalance(channel.coin as Coin);
    if (amount > bal) {
      alert(`Insufficient ${channel.coin} balance.`);
      return;
    }

    setWithdrawLoading(true);
    try {
      const res = await fetch('/api/withdraw-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coin: channel.coin,
          network: channel.networkLabel,
          address: withdrawAddress.trim(),
          amount,
          note: withdrawNote || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        console.error('Withdraw error:', data);
        alert('Unable to submit withdrawal. Please try again.');
        return;
      }

      setCoinBalance(channel.coin as Coin, bal - amount);

      setWithdrawAddress('');
      setWithdrawAmountStr('');
      setWithdrawNote('');
      alert('Withdrawal request submitted. Our team will process your payout.');
    } catch (err) {
      console.error(err);
      alert('Unexpected error submitting withdrawal.');
    } finally {
      setWithdrawLoading(false);
    }
  }

  return (
    <AppShell title="Wallet">
      {tab === 'overview' && (
        <div className="mb-5 flex justify-end">
          <div className="rounded-2xl border border-white/15 bg-black/30 px-4 py-2 text-sm">
            <div className="text-white/60">{tr('balance', lang)}</div>
            <div className="font-semibold">{fmt(balance)} USDT</div>
          </div>
        </div>
      )}

      <div className="mb-6 flex justify-center gap-3 text-xs">
        {(['overview', 'deposit', 'withdraw'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 ${
              tab === t
                ? 'bg-cyan-500 text-black shadow-[0_0_18px_rgba(34,211,238,.6)]'
                : 'border border-white/15 bg-black/40 text-white/70 hover:border-white/40'
            }`}
          >
            {t === 'overview' ? 'Overview & Convert' : t === 'deposit' ? 'Deposit' : 'Withdraw'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <section className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row">
          <div className="flex-1 rounded-2xl border border-white/10 bg-black/40 p-5 shadow-[0_0_40px_rgba(0,0,0,.6)]">
            <h2 className="mb-4 text-lg font-semibold">Wallet Overview</h2>

            <div className="mb-3 text-sm text-white/60">
              Estimated total value:{' '}
              <span className="font-semibold text-cyan-300">{fmt(totalValueUSDT)} USDT</span>
            </div>

            {priceLoading && <div className="mb-3 text-xs text-white/50">Loading prices…</div>}
            {priceError && <div className="mb-3 text-xs text-rose-300">{priceError}</div>}

            <div className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-black/60">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-xs uppercase tracking-[0.16em] text-white/50">
                  <tr>
                    <th className="px-4 py-2 text-left">Asset</th>
                    <th className="px-4 py-2 text-right">Balance</th>
                    <th className="px-4 py-2 text-right">Price (USDT)</th>
                    <th className="px-4 py-2 text-right">Value (USDT)</th>
                  </tr>
                </thead>
                <tbody>
                  {SUPPORTED_COINS.map((coin) => {
                    const bal = getCoinBalance(coin);
                    const price = prices[coin] || 0;
                    const value = coin === 'USDT' ? bal : bal * price;

                    return (
                      <tr
                        key={coin}
                        className="border-t border-white/5 odd:bg-white/0 even:bg-white/[0.02]"
                      >
                        <td className="px-4 py-2 text-left font-medium">
                          <div className="flex items-center">
                            <CoinIcon coin={coin} size={20} className="mr-2" />
                            <span>{coin}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right">
                          {fmt(bal, coin === 'USDT' ? 2 : 6)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {coin === 'USDT' ? '1.00' : price ? fmt(price, 4) : '--'}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {bal === 0 ? '0.00' : fmt(value, 2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40 p-5 shadow-[0_0_40px_rgba(0,0,0,.6)]">
            <h2 className="mb-4 text-lg font-semibold">Convert</h2>
            <p className="mb-4 text-xs text-white/60">
              Convert between supported assets using live market prices.
            </p>

            <form onSubmit={handleConvert} className="space-y-4 text-sm">
              <div>
                <label className="mb-1 block text-xs text-white/60">From</label>
                <div className="flex gap-2">
                  <select
                    className="w-28 rounded-xl border border-white/15 bg-black/50 px-2 py-2 text-xs outline-none"
                    value={fromCoin}
                    onChange={(e) => setFromCoin(e.target.value as Coin)}
                  >
                    {[...SUPPORTED_COINS, 'USDC' as Coin].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="flex-1 rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm outline-none"
                    placeholder="Amount"
                  />
                </div>
                <div className="mt-1 text-[11px] text-white/50">
                  Available:{' '}
                  <span className="text-white/80">
                    {fmt(getCoinBalance(fromCoin), fromCoin === 'USDT' ? 2 : 6)} {fromCoin}
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-white/60">To</label>
                <select
                  className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm outline-none"
                  value={toCoin}
                  onChange={(e) => setToCoin(e.target.value as Coin)}
                >
                  {[...SUPPORTED_COINS, 'USDC' as Coin].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {fromCoin !== toCoin && prices[fromCoin] && prices[toCoin] && (
                <div className="rounded-xl border border-cyan-400/25 bg-cyan-400/10 p-3 text-xs text-cyan-100">
                  1 {fromCoin} ≈{' '}
                  <span className="font-semibold">
                    {((prices[fromCoin] || 0) / (prices[toCoin] || 1)).toFixed(6)} {toCoin}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={convertLoading}
                className="mt-2 w-full rounded-xl bg-cyan-500/90 py-3 text-sm font-semibold text-black shadow-[0_0_20px_rgba(34,211,238,.6)] transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {convertLoading ? 'Converting…' : 'Convert now'}
              </button>
            </form>
          </div>
        </section>
      )}

      {tab === 'deposit' && (
        <section className="mx-auto flex max-w-md flex-col gap-5">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-5 shadow-[0_0_40px_rgba(0,0,0,.6)]">
            <h2 className="mb-2 text-lg font-semibold">Deposit coins</h2>
            <p className="mb-4 text-xs text-white/60">
              Please select the recharge channel below. Always double-check the network before transferring funds.
            </p>

            <div className="mb-4 overflow-hidden rounded-xl border border-white/10 bg-black/60">
              {DEPOSIT_OPTIONS.map((opt, idx) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedDepositId(opt.id)}
                  className={`flex w-full items-center justify-between px-4 py-3 text-xs ${
                    idx !== DEPOSIT_OPTIONS.length - 1 ? 'border-b border-white/10' : ''
                  } ${
                    selectedDepositId === opt.id
                      ? 'bg-cyan-500/10 text-cyan-100'
                      : 'text-white/80 hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <CoinIcon coin={opt.coin} size={18} />
                    <span className="font-medium">{opt.label}</span>
                  </span>
                  <span className="text-white/40">{'>'}</span>
                </button>
              ))}
            </div>

            {(() => {
              const opt =
                DEPOSIT_OPTIONS.find((d) => d.id === selectedDepositId) ?? DEPOSIT_OPTIONS[0];

              return (
                <div className="space-y-4 text-xs">
                  <div className="flex flex-col items-center">
                    <img
                      src={opt.qr}
                      alt={`${opt.label} deposit QR`}
                      className="mb-2 h-48 w-48 rounded-2xl border border-white/15 bg-white object-contain p-2"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="text-[11px] text-white/60">
                      Network: <span className="text-white/90">{opt.networkLabel}</span>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-[11px] text-white/60">Deposit address</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 truncate rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-[11px] font-mono text-white/80">
                        {opt.address}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          navigator.clipboard
                            .writeText(opt.address)
                            .then(() => alert('Address copied to clipboard'))
                            .catch(() => alert('Unable to copy address'))
                        }
                        className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-[11px] text-white/80 hover:border-white/40"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/50 p-3">
                    <div className="mb-2 text-[11px] text-white/60">
                      Upload payment receipt (optional)
                    </div>
                    <label className="block cursor-pointer rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-[11px] text-white/80 hover:border-white/40">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          setReceiptFile(f);
                        }}
                      />
                      Choose file
                    </label>
                    <div className="mt-2 text-[11px] text-white/50">
                      {receiptFile ? `Selected: ${receiptFile.name}` : 'No file selected.'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-[11px] text-amber-100">
                    {opt.description} Sending any other asset or using a different network may result in permanent loss
                    of funds.
                  </div>

                  <button
                    type="button"
                    className="w-full rounded-xl bg-cyan-500/90 py-3 text-xs font-semibold text-black shadow-[0_0_20px_rgba(34,211,238,.6)] hover:bg-cyan-400"
                    onClick={() => alert('Deposit submitted for review (demo UI).')}
                  >
                    Submit Deposit
                  </button>
                </div>
              );
            })()}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 p-5 text-xs shadow-[0_0_40px_rgba(0,0,0,.6)]">
            {PARTNER_CHANNELS.map((p) => (
              <a
                key={p.name}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="mb-2 block rounded-xl border border-white/10 bg-black/70 px-4 py-3 hover:border-cyan-400/60"
              >
                <div className="font-medium text-white/90">{p.name}</div>
                <div className="text-[11px] text-cyan-200">{p.caption}</div>
              </a>
            ))}
          </div>
        </section>
      )}

      {tab === 'withdraw' && (
        <section className="mx-auto max-w-md rounded-2xl border border-white/10 bg-black/40 p-5 text-sm shadow-[0_0_40px_rgba(0,0,0,.6)]">
          <h2 className="mb-3 text-lg font-semibold">Withdraw</h2>
          <p className="mb-4 text-xs text-white/60">
            Connect your own wallet by providing a valid payout address. Our team will review and process your
            withdrawal to this address.
          </p>

          <form onSubmit={handleWithdraw} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-white/60">Asset &amp; network</label>
              <select
                value={withdrawChannelId}
                onChange={(e) => setWithdrawChannelId(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs outline-none"
              >
                {WITHDRAW_CHANNELS.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.label}
                  </option>
                ))}
              </select>

              {(() => {
                const ch = WITHDRAW_CHANNELS.find((c) => c.id === withdrawChannelId)!;
                const bal = getCoinBalance(ch.coin as Coin);
                return (
                  <div className="mt-1 text-[11px] text-white/50">
                    Available:{' '}
                    <span className="text-white/80">
                      {fmt(bal, ch.coin === 'USDT' ? 2 : 6)} {ch.coin}
                    </span>
                    {' • '}Network: <span className="text-white/80">{ch.networkLabel}</span>
                  </div>
                );
              })()}
            </div>

            <div>
              <label className="mb-1 block text-xs text-white/60">Your wallet address</label>
              <input
                type="text"
                value={withdrawAddress}
                onChange={(e) => setWithdrawAddress(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs outline-none"
                placeholder="Paste your BTC / ETH / USDT address here"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-white/60">Amount</label>
              <input
                type="number"
                min={0}
                step="any"
                value={withdrawAmountStr}
                onChange={(e) => setWithdrawAmountStr(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs outline-none"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-white/60">Note (optional)</label>
              <textarea
                value={withdrawNote}
                onChange={(e) => setWithdrawNote(e.target.value)}
                className="h-20 w-full resize-none rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs outline-none"
                placeholder="Any reference or note for the admin..."
              />
            </div>

            <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-[11px] text-amber-100">
              Make sure the address and network are correct. Withdrawals are processed manually by our team using the
              details you provide.
            </div>

            <button
              type="submit"
              disabled={withdrawLoading}
              className="mt-2 w-full rounded-xl bg-emerald-500/90 py-3 text-xs font-semibold text-black shadow-[0_0_20px_rgba(16,185,129,.6)] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {withdrawLoading ? 'Submitting…' : 'Submit withdrawal request'}
            </button>
          </form>
        </section>
      )}
    </AppShell>
  );
}
