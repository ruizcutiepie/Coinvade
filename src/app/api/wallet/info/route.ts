import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEMO_EMAIL = 'demo@coinvade.local';
const COIN = 'USDT';

export async function GET() {
  try {
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

    return NextResponse.json({ ok: true, wallet });
  } catch (err) {
    console.error('[wallet/info] GET error:', err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
