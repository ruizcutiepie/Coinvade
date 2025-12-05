// src/app/api/wallet/deposit/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEMO_EMAIL = 'demo@coinvade.local';
const COIN = 'USDT';

async function getOrCreateDemoUserAndWallet() {
  // 1) Find or create the demo user
  let user = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
  });

  if (!user) {
    user = await prisma.user.create({
      data: { email: DEMO_EMAIL },
    });
  }

  // 2) Find or create the USDT wallet
  let wallet = await prisma.wallet.findFirst({
    where: { userId: user.id, coin: COIN },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        userId: user.id,
        coin: COIN,
        balance: 0,
      },
    });
  }

  return { user, wallet };
}

// POST /api/wallet/deposit
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null) as { amount?: number } | null;

    if (!body || typeof body.amount !== 'number') {
      return NextResponse.json(
        { ok: false, error: 'Amount is required and must be a number' },
        { status: 400 },
      );
    }

    const amount = body.amount;

    if (amount <= 0) {
      return NextResponse.json(
        { ok: false, error: 'Amount must be greater than 0' },
        { status: 400 },
      );
    }

    const { user, wallet } = await getOrCreateDemoUserAndWallet();

    // 3) Use a transaction: create DepositIntent + update wallet balance
    const [deposit, updatedWallet] = await prisma.$transaction([
      prisma.depositIntent.create({
        data: {
          userId: user.id,
          coin: COIN,
          network: 'INTERNAL', // you can adjust this later
          amount,
          status: 'CONFIRMED', // pretend it is instantly confirmed
        },
      }),
      prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: amount },
        },
      }),
    ]);

    return NextResponse.json(
      {
        ok: true,
        wallet: updatedWallet,
        deposit,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('[wallet/deposit] error:', err);
    const message = err instanceof Error ? err.message : String(err);

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
