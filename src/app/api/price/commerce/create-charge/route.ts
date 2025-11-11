import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  if (!process.env.COINBASE_COMMERCE_API_KEY) {
    return NextResponse.json(
      { error: 'Missing COINBASE_COMMERCE_API_KEY' },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const amount = Number(body.amount) || 50;
  const currency = (body.currency || 'USDT').toUpperCase();
  const description = body.description || 'Coinvade account top-up';

  // Create a Commerce charge (hosted checkout)
  const res = await fetch('https://api.commerce.coinbase.com/charges', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CC-Api-Key': process.env.COINBASE_COMMERCE_API_KEY!,
      'X-CC-Version': '2018-03-22',
    },
    body: JSON.stringify({
      name: 'Coinvade Deposit',
      description,
      pricing_type: 'no_price', // allow payer to send any amount; or use "fixed_price" with local/pricing
      metadata: {
        // put user id / email here when you add auth
        app: 'coinvade',
      },
      // Optional: send them back to your site after paying
      redirect_url: process.env.DEPOSIT_REDIRECT_URL || 'https://coinvade.vercel.app/wallet',
      cancel_url: process.env.DEPOSIT_CANCEL_URL || 'https://coinvade.vercel.app/wallet',
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: data?.error || 'Charge create failed' }, { status: 502 });
  }

  const hosted_url = data?.data?.hosted_url;
  if (!hosted_url) {
    return NextResponse.json({ error: 'No hosted_url from Coinbase' }, { status: 500 });
  }

  return NextResponse.json({ hosted_url });
}
