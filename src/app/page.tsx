// src/app/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import BigMarketsMap from './components/BigMarketsMap';
import { useLang, LANG_OPTIONS, tr, type LangCode } from './components/useLang';
import WalletBalance from './components/WalletBalance';

export default function Home() {
  const { lang, setLang } = useLang();
  const currentLang = LANG_OPTIONS.find((l) => l.code === lang) ?? LANG_OPTIONS[0];

  return (
    <main className="min-h-screen px-6 pb-16 pt-6 text-white">
      <div className="mb-8 flex items-center justify-between gap-3">
        <div className="text-lg tracking-wide text-[var(--neon)]">COINVADE</div>

        <div className="flex items-center gap-3">
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

          <WalletBalance />
        </div>
      </div>

      <div className="mb-8 flex flex-wrap justify-center gap-3 text-white/80">
        <Nav to="/verify" label={tr('nav.verify', lang)} />
        <Nav to="/markets" label={tr('nav.markets', lang)} />
        <Nav to="/wallet" label={tr('nav.wallet', lang)} />
        <Nav to="/trade" label={tr('nav.trade', lang)} />
      </div>

      <h1 className="mx-auto mb-2 max-w-5xl text-center text-4xl font-extrabold text-white sm:text-5xl">
        {tr('markets.heading', lang)}
      </h1>
      <p className="mb-10 text-center text-sm text-white/60">{tr('markets.sub', lang)}</p>

      <section className="mx-auto max-w-6xl">
        <BigMarketsMap />
      </section>
    </main>
  );
}

function Nav({ to, label }: { to: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === to || (to !== '/' && pathname?.startsWith(to));

  return (
    <Link href={to}>
      <span
        className={`inline-block rounded-xl border px-3 py-1 text-white/80 transition ${
          active
            ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-100 shadow-[0_0_14px_rgba(0,224,255,.35)]'
            : 'border-white/10 hover:border-white/40 hover:text-white'
        }`}
      >
        {label}
      </span>
    </Link>
  );
}
