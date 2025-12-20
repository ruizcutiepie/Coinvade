// src/app/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';

import BigMarketsMap from './components/BigMarketsMap';
import { useLang, LANG_OPTIONS, tr, type LangCode } from './components/useLang';
import WalletBalance from './components/WalletBalance';

export default function Home() {
  const { lang, setLang } = useLang();
  const currentLang =
    LANG_OPTIONS.find((l) => l.code === lang) ?? LANG_OPTIONS[0];

  return (
    <main className="min-h-screen px-6 pb-16 pt-6 text-white">
      {/* TOP BAR */}
      <div className="mb-8 flex items-center justify-between gap-3">
        <div className="text-lg tracking-wide text-[var(--neon)]">COINVADE</div>

        <div className="flex items-center gap-3">
          {/* LANGUAGE SELECTOR (HOMEPAGE ONLY, NOT FLOATING) */}
          <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white/70">
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

          {/* DB WALLET BALANCE */}
          <WalletBalance />
        </div>
      </div>

      {/* NAVIGATION */}
      <div className="mb-8 flex justify-center gap-8 text-white/80">
        <Nav to="#" label={tr('nav.verify', lang)} />
        <Nav to="/" label={tr('nav.markets', lang)} />
        <Nav to="/wallet" label={tr('nav.wallet', lang)} />
        <Nav to="/trade" label={tr('nav.trade', lang)} />
      </div>

      {/* MARKET SECTION */}
      <section className="mx-auto max-w-6xl">
        <BigMarketsMap />
      </section>
    </main>
  );
}

function Nav({ to, label }: { to: string; label: string }) {
  const inner = (
    <span className="inline-block rounded-xl border border-white/10 px-3 py-1 text-white/80 hover:text-white">
      {label}
    </span>
  );

  return to.startsWith('/') ? (
    <Link href={to}>{inner}</Link>
  ) : (
    <a href={to}>{inner}</a>
  );
}
