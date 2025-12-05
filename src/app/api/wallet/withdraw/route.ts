// src/app/api/wallet/withdraw/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEMO_EMAIL = 'demo@coinvade.local';
const COIN = 'USDT';

async function getOrCreateDemoUserAndWallet() {
  let user = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
  });

  if (!user) {
    user = await prisma.user.create({
      data: { email: DEMO_EMAIL },
    });
  }

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

// POST /api/wallet/withdraw
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null) as { amount?: number; address?: string; note?: string } | null;

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

    if (wallet.balance < amount) {
      return NextResponse.json(
        { ok: false, error: 'Insufficient balance' },
        { status: 400 },
      );
    }

    const payoutAddress = body.address ?? 'INTERNAL_ADDRESS';
    const note = body.note ?? null;

    // 2) Transaction: create withdraw request + decrement wallet balance
    const [withdraw, updatedWallet] = await prisma.$transaction([
      prisma.withdrawRequest.create({
        data: {
          userId: user.id,
          coin: COIN,
          network: 'INTERNAL', // later you can change this
          address: payoutAddress,
          amount,
          note,
          status: 'PAID', // for now behave like instant payout
        },
      }),
      prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: amount },
        },
      }),
    ]);

    return NextResponse.json(
      {
        ok: true,
        wallet: updatedWallet,
        withdraw,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('[wallet/withdraw] error:', err);
    const message = err instanceof Error ? err.message : String(err);

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
