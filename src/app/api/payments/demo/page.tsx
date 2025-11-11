'use client';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function DemoPayment() {
  const params = useSearchParams();
  const amount = params.get('amount');
  const success = params.get('success') || '/wallet?deposit=success';

  useEffect(() => {
    const t = setTimeout(() => {
      window.location.href = success;
    }, 2000); // simulate 2s checkout
    return () => clearTimeout(t);
  }, [success]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center text-center text-white">
      <div>
        <h1 className="text-2xl font-semibold">Demo Checkout</h1>
        <p className="mt-2 text-white/70">Processing deposit of ${amount}…</p>
        <p className="mt-2 text-white/50">You’ll be sent back in a moment.</p>
      </div>
    </main>
  );
}
