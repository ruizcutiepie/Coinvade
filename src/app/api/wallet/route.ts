// src/app/api/wallet/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import prisma from '@/lib/prisma';

function json(ok: boolean, data: any, status = 200) {
  return NextResponse.json({ ok, ...data }, { status });
}

// Decimal-safe conversion
function toNumber(v: any): number {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof v === 'object' && typeof v.toNumber === 'function') return v.toNumber();
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * GET /api/wallet
 * Returns current user's USDT wallet
 */
export async function GET(_req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    const user = session?.user as any;
    if (!user?.id) return json(false, { error: 'Unauthorized' }, 401);

    // Ensure wallet exists
    const wallet = await prisma.wallet.upsert({
      where: { userId_coin: { userId: user.id, coin: 'USDT' } },
      update: {},
      create: { userId: user.id, coin: 'USDT', balance: 0 as any },
    });

    return json(
      true,
      {
        wallet: {
          coin: wallet.coin,
          balance: toNumber(wallet.balance),
        },
      },
      200
    );
  } catch (e: any) {
    console.error('[api/wallet] GET error', e);
    return json(false, { error: 'Server error' }, 500);
  }
}
