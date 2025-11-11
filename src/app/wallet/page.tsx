// src/app/wallet/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { Suspense } from 'react';
import WalletClient from './WalletClient';

export default function WalletPage() {
  return (
    <Suspense fallback={<main className="p-8 text-white/70">Loading…</main>}>
      <WalletClient />
    </Suspense>
  );
}
