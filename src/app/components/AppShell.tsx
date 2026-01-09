// src/app/components/AppShell.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type AppShellProps = {
  children: React.ReactNode;
  title?: string;
  topRight?: React.ReactNode;
  showMobileNav?: boolean;
};

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/trade', label: 'Trade' },
  { to: '/verify', label: 'Verify' },
  { to: '/wallet', label: 'Wallet' },
  { to: '/support', label: 'CS' },
  { to: '/settings', label: 'Settings' },
];

export default function AppShell({
  children,
  title,
  topRight,
  showMobileNav = true,
}: AppShellProps) {
  const pathname = usePathname();

  const isActive = (to: string) => {
    if (to === '/') return pathname === '/';
    return pathname?.startsWith(to) ?? false;
  };

  return (
    <main className="min-h-screen px-6 pb-24 pt-6 text-white">
      {/* top bar */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="text-lg tracking-wide text-[var(--neon)]">COINVADE</div>

        <div className="flex items-center gap-3">
          {title ? <div className="text-sm text-white/60">{title}</div> : null}
          {topRight ? <div>{topRight}</div> : null}
        </div>
      </div>

      {/* desktop / tablet nav */}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-3 text-sm text-white/80">
        {NAV.map((item) => (
          <NavItem key={item.to} to={item.to} label={item.label} active={isActive(item.to)} />
        ))}
      </div>

      {/* page body */}
      <div className="mx-auto max-w-7xl">{children}</div>

      {/* mobile bottom nav */}
      {showMobileNav && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/70 backdrop-blur">
          <div className="mx-auto max-w-7xl px-3 py-3 text-[11px]">
            <div className="grid grid-cols-6 gap-2">
              {NAV.map((item) => (
                <BottomNavItem
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  active={isActive(item.to)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function NavItem({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link href={to}>
      <span
        className={`inline-block rounded-xl border px-3 py-1 transition ${
          active
            ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-100 shadow-[0_0_14px_rgba(0,224,255,.35)]'
            : 'border-white/10 text-white/80 hover:border-white/40 hover:text-white'
        }`}
      >
        {label}
      </span>
    </Link>
  );
}

function BottomNavItem({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link href={to}>
      <div
        className={`rounded-xl px-2 py-2 text-center transition ${
          active ? 'bg-cyan-500/20 text-cyan-100' : 'text-white/70 hover:bg-white/5 hover:text-white'
        }`}
      >
        {label}
      </div>
    </Link>
  );
}
