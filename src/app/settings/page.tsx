// src/app/settings/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';

type SettingsState = {
  language: 'EN' | 'ES';
  currency: 'USDT' | 'USD';
  enable2FA: boolean;
  sessionAlerts: boolean;
  marketingEmails: boolean;
};

const DEFAULTS: SettingsState = {
  language: 'EN',
  currency: 'USDT',
  enable2FA: false,
  sessionAlerts: true,
  marketingEmails: false,
};

export default function SettingsPage() {
  const [s, setS] = useState<SettingsState>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem('coinvade.settings') : null;
      if (raw) setS({ ...DEFAULTS, ...(JSON.parse(raw) as any) });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem('coinvade.settings', JSON.stringify(s));
  }, [s]);

  return (
    <AppShell title="Settings">
      <section className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-black/40 p-6 shadow-[0_0_40px_rgba(0,0,0,.6)]">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-white/60">Preferences & security toggles.</p>

        <div className="mt-6 grid gap-6">
          <div className="rounded-xl border border-white/10 bg-black/30 p-5">
            <div className="mb-3 text-sm font-semibold">Preferences</div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-white/60">Language</label>
                <select
                  value={s.language}
                  onChange={(e) => setS((p) => ({ ...p, language: e.target.value as any }))}
                  className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm outline-none"
                >
                  <option value="EN">English</option>
                  <option value="ES">Español</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-white/60">Default currency</label>
                <select
                  value={s.currency}
                  onChange={(e) => setS((p) => ({ ...p, currency: e.target.value as any }))}
                  className="w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-sm outline-none"
                >
                  <option value="USDT">USDT</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-5">
            <div className="mb-3 text-sm font-semibold">Security</div>

            <Toggle
              label="Enable 2FA"
              desc="Adds an extra verification step on login (demo toggle)."
              checked={s.enable2FA}
              onChange={(v) => setS((p) => ({ ...p, enable2FA: v }))}
            />

            <div className="mt-3">
              <Toggle
                label="Session alerts"
                desc="Notify you when a new device logs in."
                checked={s.sessionAlerts}
                onChange={(v) => setS((p) => ({ ...p, sessionAlerts: v }))}
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-5">
            <div className="mb-3 text-sm font-semibold">Notifications</div>

            <Toggle
              label="Marketing emails"
              desc="Receive product and promo updates."
              checked={s.marketingEmails}
              onChange={(v) => setS((p) => ({ ...p, marketingEmails: v }))}
            />

            <div className="mt-4 rounded-xl border border-cyan-400/25 bg-cyan-400/10 p-3 text-xs text-cyan-100">
              Saved automatically. This is stored in <span className="font-mono">localStorage</span> for now.
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="mt-1 text-xs text-white/55">{desc}</div>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`h-8 w-14 rounded-full border transition ${
          checked
            ? 'border-cyan-400/40 bg-cyan-500/30 shadow-[0_0_18px_rgba(34,211,238,.35)]'
            : 'border-white/15 bg-white/5'
        }`}
        aria-pressed={checked}
      >
        <div
          className={`h-7 w-7 translate-x-0 rounded-full bg-white/80 transition ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
