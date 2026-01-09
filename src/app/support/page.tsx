'use client';

import React from 'react';
import AppShell from '../components/AppShell';

export default function SupportPage() {
  return (
    <AppShell title="Customer Support">
      <section className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-black/40 p-6 shadow-[0_0_40px_rgba(0,0,0,.6)]">
        <h1 className="text-xl font-semibold text-white">Customer Support</h1>
        <p className="mt-2 text-sm text-white/60">
          This route is now active. Add FAQ and ticket submission here.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-sm font-semibold text-white">Support Email</div>
            <div className="mt-1 text-sm text-white/70">support@yourdomain.com</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-sm font-semibold text-white">Hours</div>
            <div className="mt-1 text-sm text-white/70">24/7</div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
