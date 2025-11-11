// src/app/payments/demo/page.tsx
import Script from 'next/script';

// Tell Next this page is dynamic so it won’t be statically pre-rendered
export const dynamic = 'force-dynamic';

export default function DemoCheckoutPage({
  searchParams,
}: {
  searchParams: { success?: string };
}) {
  const isSuccess =
    searchParams?.success === '1' ||
    searchParams?.success === 'true' ||
    searchParams?.success === 'success';

  const target = isSuccess ? '/wallet?deposit=success' : '/wallet?deposit=cancel';

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Demo Checkout</h1>
        <p className="mt-2 text-white/70">Processing demo checkout…</p>
        <p className="mt-2 text-white/50">You’ll be sent back to the wallet shortly.</p>

        {/* Inline client-side redirect (works in a Server Component) */}
        <Script id="demo-redirect">
          {`setTimeout(function(){ window.location.href = '${target}'; }, 1500);`}
        </Script>
      </div>
    </main>
  );
}
