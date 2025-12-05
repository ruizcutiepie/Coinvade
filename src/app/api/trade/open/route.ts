// src/app/api/trade/open/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// For now we use your single demo user.
const DEMO_EMAIL = 'demo@coinvade.local';

// The pairs your app supports
const ALLOWED_PAIRS = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'XRPUSDT',
  'ADAUSDT',
  'BNBUSDT',
  'DOGEUSDT',
  'DOTUSDT',
] as const;

// Helper: get or create the demo user + USDT wallet
async function getOrCreateDemoUser() {
  let user = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
  });

  if (!user) {
    user = await prisma.user.create({
      data: { email: DEMO_EMAIL },
    });
  }

  let usdtWallet = await prisma.wallet.findFirst({
    where: { userId: user.id, coin: 'USDT' },
  });

  if (!usdtWallet) {
    usdtWallet = await prisma.wallet.create({
      data: {
        userId: user.id,
        coin: 'USDT',
        balance: 1000, // starting demo balance
      },
    });
  }

  return { user, usdtWallet };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      pair?: string;
      direction?: string;
      amount?: number;
      duration?: number;
    } | null;

    if (!body) {
      return NextResponse.json(
        { ok: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    let { pair, direction, amount, duration } = body;

    // ---------- Validate + normalize inputs ----------

    if (!pair || typeof pair !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Missing or invalid "pair".' },
        { status: 400 }
      );
    }

    pair = pair.toUpperCase();

    if (!ALLOWED_PAIRS.includes(pair as (typeof ALLOWED_PAIRS)[number])) {
      return NextResponse.json(
        { ok: false, error: 'Unsupported trading pair.' },
        { status: 400 }
      );
    }

    if (!direction || typeof direction !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Missing "direction".' },
        { status: 400 }
      );
    }

    const normalizedDirection = direction.toUpperCase();
    if (normalizedDirection !== 'LONG' && normalizedDirection !== 'SHORT') {
      return NextResponse.json(
        { ok: false, error: 'Direction must be "LONG" or "SHORT".' },
        { status: 400 }
      );
    }

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json(
        { ok: false, error: 'Amount must be a positive number.' },
        { status: 400 }
      );
    }

    const dur = Math.round(Number(duration));
    if (!Number.isFinite(dur) || dur <= 0 || dur > 3600) {
      return NextResponse.json(
        { ok: false, error: 'Duration must be between 1 and 3600 seconds.' },
        { status: 400 }
      );
    }

    // ---------- Get demo user + wallet ----------

    const { user } = await getOrCreateDemoUser();

    // ---------- Fetch live entry price ----------

    const url = new URL(req.url);
    const origin = url.origin; // e.g. http://localhost:3000

    const priceRes = await fetch(
      `${origin}/api/price?symbol=${encodeURIComponent(pair)}`,
      { cache: 'no-store' }
    );

    const priceData = (await priceRes.json().catch(() => null)) as
      | { price?: number }
      | null;

    if (!priceRes.ok || !priceData || typeof priceData.price !== 'number') {
      console.error('Price fetch failed:', priceData);
      return NextResponse.json(
        { ok: false, error: 'Unable to fetch price for this pair.' },
        { status: 502 }
      );
    }

    const entryPrice = Number(priceData.price);

    // ---------- Create trade + deduct balance (transaction) ----------

    const trade = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findFirst({
        where: {
          userId: user.id,
          coin: 'USDT',
        },
      });

      if (!wallet) {
        // this will be caught below
        throw new Error('NO_USDT_WALLET');
      }

      if (wallet.balance < amt) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: wallet.balance - amt,
        },
      });

      const newTrade = await tx.trade.create({
        data: {
          userId: user.id,
          pair,
          direction: normalizedDirection,
          amount: amt,
          duration: dur,
          entryPrice,
          exitPrice: null,
          won: null,
          payout: 0,
        },
      });

      return newTrade;
    });

    return NextResponse.json(
      {
        ok: true,
        trade,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[trade/open] error:', err);

    const msg: string = typeof err?.message === 'string' ? err.message : '';

    if (msg === 'NO_USDT_WALLET') {
      return NextResponse.json(
        { ok: false, error: 'USDT wallet not found for this user.' },
        { status: 400 }
      );
    }

    if (msg === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json(
        { ok: false, error: 'Insufficient USDT balance.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, error: 'Server error while opening trade.' },
      { status: 500 }
    );
  }
}
