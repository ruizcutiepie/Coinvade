// src/app/api/db-test/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma'; // uses src/app/lib/prisma.ts

// Helper: make sure a demo user + USDT wallet exist
async function ensureDemoUserAndWallet() {
  const email = 'demo@coinvade.local';

  // 1) Find or create the user
  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    user = await prisma.user.create({
      data: { email },
    });
  }

  // 2) Find or create a USDT wallet for this user
  let wallet = await prisma.wallet.findFirst({
    where: { userId: user.id, coin: 'USDT' },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        userId: user.id,
        coin: 'USDT',
        balance: 1000, // demo starting balance
      },
    });
  }

  return { user, wallet };
}

// GET /api/db-test
export async function GET() {
  try {
    const { user, wallet } = await ensureDemoUserAndWallet();

    return NextResponse.json(
      {
        ok: true,
        user,
        wallet,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('[db-test] DB error:', err);

    const message =
      err instanceof Error ? err.message : JSON.stringify(err);

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
