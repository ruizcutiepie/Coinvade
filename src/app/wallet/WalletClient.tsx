'use client';

import React, { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell';
import CoinIcon from '../components/CoinIcon';
import { useLang, tr } from '../components/useLang';

type Row = {
  coin: string;
  balance: number;
  price: number; // USDT price per 1 coin
  value: number; // balance * price
};

const COINS = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'BNB', 'DOGE', 'DOT', 'USDT'] as const;

function fmt(n: number, d = 2) {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}

function toNum(v: any) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Attempts to load balances from:
 * - /api/wallet/info (recommended)
 * - /api/wallet (fallback)
 *
 * Expected shapes (any of these):
 * { ok:true, balances: { BTC: 0.1, USDT: 50 } }
 * { ok:true, wallet: { coin:'USDT', balance: 50 } }  <-- older single wallet variant
 */
async function fetchBalances(): Promise<Record<string, number>> {
  const urls = ['/api/wallet/info', '/api/wallet'];

  for (const url of urls) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) continue;
      const j = await safeJson(r);
      if (!j?.ok) continue;

      // Preferred
      if (j?.balances && typeof j.balances === 'object') {
        const out: Record<string, number> = {};
        for (const k of Object.keys(j.balances)) out[k.toUpperCase()] = toNum(j.balances[k]);
        return out;
      }

      // Sometimes wallet arrays
      if (Array.isArray(j?.wallets)) {
        const out: Record<string, number> = {};
        for (const w of j.wallets) {
          const coin = String(w?.coin || '').toUpperCase();
          if (!coin) continue;
          out[coin] = toNum(w?.balance);
        }
        return out;
      }

      // Older single wallet (USDT-only)
      if (j?.wallet?.coin) {
        const coin = String(j.wallet.coin).toUpperCase();
        return { [coin]: toNum(j.wallet.balance) };
      }
    } catch {
      // ignore and try next
    }
  }

  // Default if nothing worked (keeps UI alive)
  const out: Record<string, number> = {};
  for (const c of COINS) out[c] = 0;
  return out;
}

/**
 * Prices: uses /api/price?symbol=XXXUSDT if available.
 * USDT always = 1.
 */
async function fetchPriceUSDT(coin: string): Promise<number> {
  const c = coin.toUpperCase();
  if (c === 'USDT') return 1;

  const symbol = `${c}USDT`;
  const urls = [
    `/api/price?symbol=${encodeURIComponent(symbol)}`,
    `/api/binance-test?symbol=${encodeURIComponent(symbol)}`,
  ];

  for (const url of urls) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) continue;
      const j = await safeJson(r);

      // common shapes:
      // { ok:true, price: 123 }
      // { price: 123 }
      // { ok:true, data:{ price: 123 } }
      const p =
        toNum(j?.price) ||
        toNum(j?.data?.price) ||
        toNum(j?.lastPrice) ||
        toNum(j?.data?.lastPrice);

      if (p > 0) return p;
    } catch {
      // ignore
    }
  }

  // fallback (keeps table stable if api is unavailable)
  return 0;
}

export default function WalletClient() {
  const { lang } = useLang();

  const [tab, setTab] = useState<'overview' | 'deposit' | 'withdraw'>('overview');

  const [balances, setBalances] = useState<Record<string, number>>({});
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Convert UI state (UI-only; action is best-effort)
  const [fromCoin, setFromCoin] = useState<string>('BTC');
  const [toCoin, setToCoin] = useState<string>('USDT');
  const [amountStr, setAmountStr] = useState<string>('');

  // Deposit UI state (simple demo)
  const [depCoin, setDepCoin] = useState<string>('USDT');
  const [depNetwork, setDepNetwork] = useState<string>('TRC20');
  const [depTxHash, setDepTxHash] = useState<string>('');
  const [depAmount, setDepAmount] = useState<string>('');

  // Withdraw UI state
  const [wdCoin, setWdCoin] = useState<string>('USDT');
  const [wdNetwork, setWdNetwork] = useState<string>('TRC20');
  const [wdAddress, setWdAddress] = useState<string>('');
  const [wdAmount, setWdAmount] = useState<string>('');
  const [wdNote, setWdNote] = useState<string>('');

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    for (const c of COINS) {
      const bal = toNum(balances?.[c] ?? 0);
      const price = toNum(prices?.[c] ?? (c === 'USDT' ? 1 : 0));
      out.push({
        coin: c,
        balance: bal,
        price,
        value: bal * price,
      });
    }
    return out;
  }, [balances, prices]);

  const totalUSDT = useMemo(() => {
    return rows.reduce((sum, r) => sum + toNum(r.value), 0);
  }, [rows]);

  const walletUSDT = useMemo(() => {
    return toNum(balances?.USDT ?? 0);
  }, [balances]);

  const fromAvailable = useMemo(() => {
    return toNum(balances?.[fromCoin.toUpperCase()] ?? 0);
  }, [balances, fromCoin]);

  const rateText = useMemo(() => {
    const f = fromCoin.toUpperCase();
    const t = toCoin.toUpperCase();
    const fp = toNum(prices?.[f] ?? (f === 'USDT' ? 1 : 0));
    const tp = toNum(prices?.[t] ?? (t === 'USDT' ? 1 : 0));
    if (fp <= 0 || tp <= 0) return `${f} → ${t}`;
    const one = fp / tp;
    return `1 ${f} ≈ ${fmt(one, 6)} ${t}`;
  }, [fromCoin, toCoin, prices]);

  async function refresh() {
    setLoading(true);
    try {
      const b = await fetchBalances();
      setBalances(b);

      // fetch prices for supported coins (parallel)
      const entries = await Promise.all(
        COINS.map(async (c) => [c, await fetchPriceUSDT(c)] as const)
      );
      const pMap: Record<string, number> = {};
      for (const [k, v] of entries) pMap[k] = v;
      pMap.USDT = 1;
      setPrices(pMap);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onConvert() {
    // Best-effort call. If route doesn’t exist, it won’t break the UI.
    const amount = toNum(amountStr);
    if (!amount || amount <= 0) return alert('Enter a valid amount');

    try {
      const r = await fetch('/api/wallet/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromCoin.toUpperCase(),
          to: toCoin.toUpperCase(),
          amount,
        }),
      });
      const j = await safeJson(r);

      if (!r.ok || !j?.ok) {
        // If convert route not implemented, we still keep going without crashing
        alert(j?.error || 'Convert is not enabled yet (UI only).');
        return;
      }

      await refresh();
      setAmountStr('');
    } catch {
      alert('Convert is not enabled yet (UI only).');
    }
  }

  async function onCreateDepositIntent() {
    const amount = depAmount ? toNum(depAmount) : undefined;

    try {
      const r = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coin: depCoin.toUpperCase(),
          network: depNetwork,
          amount,
          txHash: depTxHash || undefined,
        }),
      });

      const j = await safeJson(r);
      if (!r.ok || !j?.ok) return alert(j?.error || 'Deposit request failed');

      alert('Deposit intent created.');
      setDepTxHash('');
      setDepAmount('');
    } catch {
      alert('Deposit request failed');
    }
  }

  async function onWithdraw() {
    const amount = toNum(wdAmount);
    if (!wdAddress.trim()) return alert('Enter address');
    if (!amount || amount <= 0) return alert('Enter a valid amount');

    try {
      const r = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coin: wdCoin.toUpperCase(),
          network: wdNetwork,
          address: wdAddress.trim(),
          amount,
          note: wdNote || undefined,
        }),
      });

      const j = await safeJson(r);
      if (!r.ok || !j?.ok) return alert(j?.error || 'Withdraw failed');

      alert('Withdraw request submitted.');
      await refresh();
      setWdAmount('');
      setWdAddress('');
      setWdNote('');
    } catch {
      alert('Withdraw failed');
    }
  }

  return (
    <AppShell>
      {/* Top right balance chip (matches your UI expectation) */}
      <div className="flex justify-end">
        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white">
          <div className="text-xs text-white/60">{tr('wallet.balance', lang) || 'Balance'}</div>
          <div className="font-semibold">
            {fmt(walletUSDT, 2)} <span className="text-white/70">USDT</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex items-center justify-center gap-2">
        <button
          onClick={() => setTab('overview')}
          className={[
            'rounded-full px-5 py-2 text-sm transition',
            tab === 'overview'
              ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40'
              : 'bg-white/5 text-white/70 hover:bg-white/10',
          ].join(' ')}
        >
          {tr('wallet.overview', lang) || 'Overview & Convert'}
        </button>

        <button
          onClick={() => setTab('deposit')}
          className={[
            'rounded-full px-5 py-2 text-sm transition',
            tab === 'deposit'
              ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40'
              : 'bg-white/5 text-white/70 hover:bg-white/10',
          ].join(' ')}
        >
          {tr('wallet.deposit', lang) || 'Deposit'}
        </button>

        <button
          onClick={() => setTab('withdraw')}
          className={[
            'rounded-full px-5 py-2 text-sm transition',
            tab === 'withdraw'
              ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40'
              : 'bg-white/5 text-white/70 hover:bg-white/10',
          ].join(' ')}
        >
          {tr('wallet.withdraw', lang) || 'Withdraw'}
        </button>
      </div>

      {/* Content */}
      {tab === 'overview' && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Wallet Overview */}
          <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
            <div className="text-white text-xl font-semibold">
              {tr('wallet.wallet_overview', lang) || 'Wallet Overview'}
            </div>
            <div className="mt-2 text-white/60">
              {tr('wallet.estimated_total', lang) || 'Estimated total value:'}{' '}
              <span className="text-cyan-200 font-semibold">{fmt(totalUSDT, 2)} USDT</span>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-white/60">
                  <tr>
                    <th className="px-3 py-2 text-left">{tr('wallet.asset', lang) || 'ASSET'}</th>
                    <th className="px-3 py-2 text-right">{tr('wallet.balance', lang) || 'BALANCE'}</th>
                    <th className="px-3 py-2 text-right">{tr('wallet.price', lang) || 'PRICE (USDT)'}</th>
                    <th className="px-3 py-2 text-right">{tr('wallet.value', lang) || 'VALUE (USDT)'}</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((r) => (
                    <tr key={r.coin} className="border-t border-white/5">
                      <td className="px-3 py-2 text-white/80">
                        <div className="flex items-center gap-2">
                          <CoinIcon coin={r.coin} size={18} />
                          <span className="font-semibold">{r.coin}</span>
                        </div>
                      </td>

                      <td className="px-3 py-2 text-right text-white/90">
                        {fmt(r.balance, r.coin === 'USDT' ? 2 : 6)}
                      </td>

                      <td className="px-3 py-2 text-right text-white/80">
                        {r.coin === 'USDT' ? '1.00' : fmt(r.price, 4)}
                      </td>

                      <td className="px-3 py-2 text-right text-white/90">{fmt(r.value, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 text-xs text-white/40">
              {loading ? 'Loading balances & prices…' : tr('wallet.note', lang) || 'Icons are local-rendered.'}
            </div>

            <div className="mt-4">
              <button
                onClick={refresh}
                className="rounded-full bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Convert */}
          <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
            <div className="text-white text-xl font-semibold">
              {tr('wallet.convert', lang) || 'Convert'}
            </div>
            <div className="mt-2 text-white/60 text-sm">
              {tr('wallet.convert_desc', lang) ||
                'Convert between supported assets using live market prices.'}
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <div className="text-xs text-white/60 mb-2">{tr('wallet.from', lang) || 'From'}</div>
                <div className="flex gap-3">
                  <select
                    value={fromCoin}
                    onChange={(e) => setFromCoin(e.target.value)}
                    className="w-40 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
                  >
                    {COINS.filter((c) => c !== 'USDT').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <input
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder={tr('wallet.amount', lang) || 'Amount'}
                    className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white placeholder:text-white/30"
                  />
                </div>
                <div className="mt-2 text-xs text-cyan-200">
                  {tr('wallet.available', lang) || 'Available:'} {fmt(fromAvailable, 6)} {fromCoin}
                </div>
              </div>

              <div>
                <div className="text-xs text-white/60 mb-2">{tr('wallet.to', lang) || 'To'}</div>
                <select
                  value={toCoin}
                  onChange={(e) => setToCoin(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
                >
                  {COINS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-white/10 bg-cyan-900/20 px-4 py-3 text-cyan-100 text-sm">
                {rateText}
              </div>

              <button
                onClick={onConvert}
                className="w-full rounded-2xl bg-cyan-600/80 px-4 py-3 font-semibold text-black hover:bg-cyan-500"
              >
                {tr('wallet.convert_now', lang) || 'Convert now'}
              </button>

              <div className="text-xs text-white/35">
                If `/api/wallet/convert` isn’t implemented yet, this stays UI-safe and won’t break builds.
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'deposit' && (
        <div className="mt-8 rounded-3xl border border-white/10 bg-black/30 p-6">
          <div className="text-white text-xl font-semibold">{tr('wallet.deposit', lang) || 'Deposit'}</div>
          <div className="mt-2 text-white/60 text-sm">
            Create a deposit intent (demo/admin flow).
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs text-white/60 mb-2">Coin</div>
              <select
                value={depCoin}
                onChange={(e) => setDepCoin(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
              >
                {COINS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-xs text-white/60 mb-2">Network</div>
              <input
                value={depNetwork}
                onChange={(e) => setDepNetwork(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
                placeholder="TRC20 / ERC20 / BEP20"
              />
            </div>

            <div>
              <div className="text-xs text-white/60 mb-2">TX Hash (optional)</div>
              <input
                value={depTxHash}
                onChange={(e) => setDepTxHash(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
                placeholder="0x..."
              />
            </div>

            <div>
              <div className="text-xs text-white/60 mb-2">Amount (optional)</div>
              <input
                value={depAmount}
                onChange={(e) => setDepAmount(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
                placeholder="100"
              />
            </div>
          </div>

          <button
            onClick={onCreateDepositIntent}
            className="mt-6 rounded-2xl bg-white/10 px-5 py-3 font-semibold text-white hover:bg-white/15"
          >
            Create deposit intent
          </button>
        </div>
      )}

      {tab === 'withdraw' && (
        <div className="mt-8 rounded-3xl border border-white/10 bg-black/30 p-6">
          <div className="text-white text-xl font-semibold">{tr('wallet.withdraw', lang) || 'Withdraw'}</div>
          <div className="mt-2 text-white/60 text-sm">Submit a withdrawal request.</div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs text-white/60 mb-2">Coin</div>
              <select
                value={wdCoin}
                onChange={(e) => setWdCoin(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
              >
                {COINS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-xs text-white/60 mb-2">Network</div>
              <input
                value={wdNetwork}
                onChange={(e) => setWdNetwork(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
                placeholder="TRC20 / ERC20 / BEP20"
              />
            </div>

            <div className="md:col-span-2">
              <div className="text-xs text-white/60 mb-2">Address</div>
              <input
                value={wdAddress}
                onChange={(e) => setWdAddress(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
                placeholder="Recipient address"
              />
            </div>

            <div>
              <div className="text-xs text-white/60 mb-2">Amount</div>
              <input
                value={wdAmount}
                onChange={(e) => setWdAmount(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
                placeholder="10"
              />
            </div>

            <div>
              <div className="text-xs text-white/60 mb-2">Note (optional)</div>
              <input
                value={wdNote}
                onChange={(e) => setWdNote(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
                placeholder="Optional note"
              />
            </div>
          </div>

          <button
            onClick={onWithdraw}
            className="mt-6 rounded-2xl bg-white/10 px-5 py-3 font-semibold text-white hover:bg-white/15"
          >
            Submit withdraw request
          </button>
        </div>
      )}
    </AppShell>
  );
}
