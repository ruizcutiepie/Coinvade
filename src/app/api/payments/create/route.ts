import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { amount, successPath, cancelPath } = await req.json();

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  // Redirect to a local demo page that simulates a hosted checkout
  const hostedUrl = new URL(`/payments/demo?amount=${amount}&success=${encodeURIComponent(successPath ?? '/wallet?deposit=success')}`, base).toString();

  return NextResponse.json({ hostedUrl });
}
