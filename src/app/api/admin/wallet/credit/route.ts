import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import prisma from '@/lib/prisma';

function json(ok: boolean, data: any, status = 200) {
  return NextResponse.json({ ok, ...data }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    const actor = session?.user as any;

    // 🔒 ADMIN ONLY
    if (!actor?.id || actor.role !== 'ADMIN') {
      return json(false, { error: 'Forbidden' }, 403);
    }

    const body = await req.json().catch(() => ({} as any));
    const userId = String(body?.userId || actor.id);
    const amount = Number(body?.amount || 0);

    if (!Number.isFinite(amount) || amount <= 0) {
      return json(false, { error: 'Invalid amount' }, 400);
    }

    const wallet = await prisma.wallet.upsert({
      where: { userId_coin: { userId, coin: 'USDT' } },
      update: { balance: { increment: amount } },
      create: { userId, coin: 'USDT', balance: amount },
    });

    return json(true, { wallet }, 200);
  } catch (e: any) {
    console.error('[admin wallet credit]', e);
    return json(false, { error: 'Server error' }, 500);
  }
}
