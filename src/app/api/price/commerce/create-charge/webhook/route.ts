import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  const secret = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Missing webhook secret' }, { status: 500 });

  const signature = (req.headers.get('X-CC-Webhook-Signature') || '').trim();
  const rawBody = await req.text();
  const hmac = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(signature, 'hex'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(rawBody);
  // event.type can be: 'charge:created', 'charge:pending', 'charge:confirmed', 'charge:failed', 'charge:delayed'
  const type = event?.event?.type;
  const charge = event?.event?.data;

  // When type === 'charge:confirmed' → funds received and confirmed on-chain
  if (type === 'charge:confirmed') {
    // TODO: look up which user this belongs to (use charge.metadata.userId once you add auth)
    // TODO: credit their balance in your database
    // For demo we can just log:
    console.log('CONFIRMED DEPOSIT:', {
      code: charge?.code,
      hosted_url: charge?.hosted_url,
      payments: charge?.payments?.map((p:any)=>({ value:p.value, confirmed_at:p.confirmed_at })),
    });
  }

  return NextResponse.json({ ok: true });
}
