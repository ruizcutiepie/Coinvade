// src/app/components/WalletBalance.tsx
'use client';

import React, { useEffect, useState } from 'react';

function fmt(n: number, d = 2) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

const STORAGE_KEY = 'coinvade.walletBalance';

const WalletBalance: React.FC = () => {
  // ✅ Default should NEVER be demo. Start at 0 (or null if you prefer "—").
  const [balance, setBalance] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('USDT');

  useEffect(() => {
    let cancelled = false;

    const applyBalance = (value: number) => {
      if (!cancelled) setBalance(value);
    };

    const loadFromBackend = async () => {
      try {
        // ✅ Use the real Prisma-backed endpoint
        const res = await fetch('/api/wallet', { cache: 'no-store' });

        // If not logged in, just show 0 (no scary errors / no fake balance)
        if (res.status === 401) {
          applyBalance(0);
          setCurrency('USDT');

          // ✅ Clear any old demo localStorage value
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(STORAGE_KEY);
          }
          return;
        }

        const j = await res.json();
        if (cancelled) return;

        // Expected response from /api/wallet: { balance: number, deposits: [...] }
        const next = Number(j?.balance ?? 0);
        applyBalance(Number.isFinite(next) ? next : 0);
        setCurrency('USDT');

        // ✅ Keep localStorage only as a cache (never as the source of truth)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, String(next));
        }
      } catch (err) {
        console.error('[WalletBalance] failed to load wallet', err);
        // If backend fails, do NOT show demo balance — stay safe at 0
        applyBalance(0);
        setCurrency('USDT');
      }
    };

    // ✅ On mount: always trust backend
    loadFromBackend();

    // ✅ Listen for cross-page updates (e.g., after trade/deposit approval)
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ balance: number }>;
      if (typeof custom.detail?.balance === 'number') {
        const next = custom.detail.balance;
        applyBalance(next);

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, String(next));
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
        {fmt(balance, 2)} {currency}
      </span>
    </div>
  );
};

export default WalletBalance;
