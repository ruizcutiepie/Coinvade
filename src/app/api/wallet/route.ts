// src/app/api/wallet/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import prisma from '@/lib/prisma';

function json(ok: boolean, data: any, status = 200) {
  return NextResponse.json({ ok, ...data }, { status });
}

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    const user = session?.user as any;
    if (!user?.id) return json(false, { error: 'Unauthorized' }, 401);

    const wallet = await prisma.wallet.upsert({
      where: { userId_coin: { userId: user.id, coin: 'USDT' } },
      update: {},
      create: { userId: user.id, coin: 'USDT', balance: 0 },
    });

    return json(true, { balance: Number(wallet.balance ?? 0) }, 200);
  } catch (e: any) {
    console.error('[api/wallet] GET error', e);
    return json(false, { error: String(e?.message || 'Server error') }, 500);
  }
}
