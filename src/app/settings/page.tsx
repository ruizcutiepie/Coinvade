'use client';

import React from 'react';
import AppShell from '../components/AppShell';

export default function SettingsPage() {
  return (
    <AppShell title="Settings">
      <section className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-black/40 p-6 shadow-[0_0_40px_rgba(0,0,0,.6)]">
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <p className="mt-2 text-sm text-white/60">
          This route is now active. Add preferences and security toggles here.
        </p>

        <div className="mt-5 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
          Coming soon: Language, currency, 2FA, password reset, sessions.
        </div>
      </section>
    </AppShell>
  );
}
