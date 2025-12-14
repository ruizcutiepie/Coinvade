// src/app/api/withdraw-request/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    const user = session?.user as any;

    if (!user?.id) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const coin = String(body?.coin || 'USDT').toUpperCase();
    const network = String(body?.network || '').trim();
    const address = String(body?.address || '').trim();
    const amount = Number(body?.amount);

    if (!network || !address || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
    }

    // wallet lookup (USDT)
    const wallet = await prisma.wallet.findFirst({
      where: { userId: user.id, coin },
      select: { id: true, balance: true },
    });

    if (!wallet) {
      return NextResponse.json({ ok: false, error: `Wallet not found for ${coin}` }, { status: 404 });
    }

    if (wallet.balance < amount) {
      return NextResponse.json({ ok: false, error: 'Insufficient balance' }, { status: 400 });
    }

    // get Withdrawal model safely (in case naming differs)
    const prismaAny = prisma as any;
    const withdrawalModel =
      prismaAny.withdrawal ?? prismaAny.withdrawalRequest ?? prismaAny.withdrawals;

    if (!withdrawalModel) {
      return NextResponse.json({ ok: false, error: 'Withdrawal model not found in Prisma' }, { status: 500 });
    }

    const created = await prisma.$transaction(async (tx) => {
      // 1) deduct balance immediately
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      });

      // 2) create withdrawal request
      const txAny = tx as any;
      const txWithdrawalModel =
        txAny.withdrawal ?? txAny.withdrawalRequest ?? txAny.withdrawals;

      const w = await txWithdrawalModel.create({
        data: {
          userId: user.id,
          coin,
          network,
          address,
          amount,
          status: 'PENDING',
          note: null,
        },
      });

      return w;
    });

    return NextResponse.json({ ok: true, withdrawal: created });
  } catch (e: any) {
    console.error('[withdraw-request] error', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Server error' },
      { status: 500 }
    );
  }
}
