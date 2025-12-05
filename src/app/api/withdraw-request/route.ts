// src/app/api/withdraw-request/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { coin, network, address, amount, note } = body ?? {};

    if (
      !coin ||
      !network ||
      !address ||
      typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        { error: 'Invalid withdrawal payload' },
        { status: 400 }
      );
    }

    // 👉 This is where "real" integration goes:
    // - Insert into your database
    // - Send email / Telegram to admin
    // - Push into an internal dashboard, etc.
    // For now we log to the server console so you can see it in `npm run dev`.
    console.log('NEW WITHDRAW REQUEST', {
      coin,
      network,
      address,
      amount,
      note: note ?? null,
      ts: Date.now(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Withdraw API error', err);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
