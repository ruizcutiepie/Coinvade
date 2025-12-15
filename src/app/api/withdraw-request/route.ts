import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import prisma from '@/lib/prisma';

function json(ok: boolean, data: any, status = 200) {
  return NextResponse.json({ ok, ...data }, { status });
}

function pickWithdrawalModel(prismaAny: any) {
  return (
    prismaAny.withdrawalRequest ||
    prismaAny.withdrawal ||
    prismaAny.withdrawals ||
    prismaAny.withdrawalModel ||
    null
  );
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any);
    const user = (session as any)?.user;

    if (!user?.id) return json(false, { error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const coin = String(body?.coin || 'USDT').toUpperCase();
    const network = String(body?.network || '').trim();
    const address = String(body?.address || '').trim();
    const amount = Number(body?.amount || 0);

    if (!address) return json(false, { error: 'Address is required' }, 400);
    if (!network) return json(false, { error: 'Network is required' }, 400);
    if (!Number.isFinite(amount) || amount <= 0) {
      return json(false, { error: 'Invalid amount' }, 400);
    }

    const prismaAny = prisma as any;
    const WithdrawalModel = pickWithdrawalModel(prismaAny);
    if (!WithdrawalModel) {
      return json(
        false,
        {
          error:
            "No withdrawal model found on Prisma client. Expected one of: withdrawalRequest / withdrawal / withdrawals / withdrawalModel.",
        },
        500
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const txAny = tx as any;
      const TxWithdrawalModel = pickWithdrawalModel(txAny);
      if (!TxWithdrawalModel) {
        throw new Error('Withdrawal model missing inside transaction');
      }

      const wallet = await tx.wallet.findFirst({
        where: { userId: user.id, coin },
      });

      const balance = Number(wallet?.balance || 0);
      if (!wallet || balance < amount) {
        throw new Error('Insufficient balance');
      }

      // ✅ deduct immediately (reserve funds)
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      });

      // ✅ create withdrawal request (PENDING)
      const w = await TxWithdrawalModel.create({
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

    return json(true, { withdrawal: created });
  } catch (e: any) {
    const msg = String(e?.message || 'Server error');
    if (msg.toLowerCase().includes('insufficient balance')) {
      return json(false, { error: msg }, 400);
    }
    console.error('[withdraw-request] error', e);
    return json(false, { error: msg }, 500);
  }
}
