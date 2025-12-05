// src/app/components/WalletBalance.tsx
'use client';

import React, { useEffect, useState } from 'react';

function fmt(n: number, d = 2) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

const WalletBalance: React.FC = () => {
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>('USDT');

  useEffect(() => {
    let cancelled = false;

    const applyBalance = (value: number | null) => {
      if (!cancelled) setBalance(value);
    };

    // ✅ 1. Try localStorage first so all pages share a value
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('coinvade.walletBalance');
      if (stored != null && !Number.isNaN(Number(stored))) {
        applyBalance(Number(stored));
      }
    }

    // ✅ 2. Load from backend once (source of truth when app starts)
    const loadFromBackend = async () => {
      try {
        const res = await fetch('/api/wallet/info', { cache: 'no-store' });
        const j = await res.json();
        if (cancelled) return;

        if (res.ok && j?.ok && j.wallet) {
          const next = Number(j.wallet.balance ?? 0);
          applyBalance(next);
          setCurrency(j.wallet.currency ?? 'USDT');

          if (typeof window !== 'undefined') {
            window.localStorage.setItem('coinvade.walletBalance', String(next));
          }
        }
      } catch (err) {
        console.error('[WalletBalance] failed to load wallet', err);
      }
    };

    loadFromBackend();

    // ✅ 3. Listen for cross-page updates from trades
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ balance: number }>;
      if (typeof custom.detail?.balance === 'number') {
        applyBalance(custom.detail.balance);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            'coinvade.walletBalance',
            String(custom.detail.balance)
          );
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('coinvade-wallet-updated', handler);
    }

    return () => {
      cancelled = true;
      if (typeof window !== 'undefined') {
        window.removeEventListener('coinvade-wallet-updated', handler);
      }
    };
  }, []);

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white/80">
      <span className="text-[11px] uppercase tracking-[0.16em] text-white/50">
        Wallet
      </span>
      <span className="font-mono text-sm text-white">
        {balance != null ? fmt(balance, 2) : '—'} {currency}
      </span>
    </div>
  );
};

export default WalletBalance;
