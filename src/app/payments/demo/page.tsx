'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function DemoCheckout() {
  const search = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const amount = Number(search.get('amount') || 0);
    const success = search.get('success') || '/wallet?deposit=success';

    // 1) create a pending deposit in our in-memory store
    if (amount > 0) {
      fetch('/api/wallet/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          txId: 'demo-' + Date.now(),
        }),
      }).catch(console.error);
    }

    // 2) pretend the hosted checkout finished & redirect back
    const t = setTimeout(() => {
      router.replace(success);
    }, 1500);

    return () => clearTimeout(t);
  }, [search, router]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center text-white">
      <div>
        <h1 className="text-2xl font-semibold">Demo Checkout</h1>
        <p className="mt-2 text-white/70">Processing deposit…</p>
        <p className="mt-2 text-white/50">You’ll be sent back to Wallet shortly.</p>
      </div>
    </main>
  );
}
