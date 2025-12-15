import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import prisma from '@/lib/prisma';

function json(ok: boolean, data: any, status = 200) {
  return NextResponse.json({ ok, ...data }, { status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    const user = session?.user as any;

    if (!user || user.role !== 'ADMIN') {
      return json(false, { error: 'Unauthorized' }, 401);
    }

    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '').toUpperCase(); // APPROVE / REJECT

    if (action !== 'APPROVE' && action !== 'REJECT') {
      return json(false, { error: "Invalid action. Use 'APPROVE' or 'REJECT'." }, 400);
    }

    // NOTE: adjust model name if yours is DepositIntent (based on Prisma Studio screenshot)
    const updated = await prisma.$transaction(async (tx) => {
      const dep = await tx.depositIntent.findUnique({ where: { id } });
      if (!dep) throw new Error('Deposit not found');

      // prevent double-processing
      if (dep.status !== 'PENDING') return dep;

      if (action === 'REJECT') {
        return await tx.depositIntent.update({
          where: { id },
          data: { status: 'REJECTED' },
        });
      }

      // APPROVE: mark approved + credit wallet
      const amount = Number(dep.amount || 0);
      if (!amount || amount <= 0) throw new Error('Deposit amount is invalid');

      const wallet = await tx.wallet.findFirst({
        where: { userId: dep.userId, coin: dep.coin },
      });

      if (wallet) {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: amount } },
        });
      } else {
        await tx.wallet.create({
          data: { userId: dep.userId, coin: dep.coin, balance: amount },
        });
      }

      return await tx.depositIntent.update({
        where: { id },
        data: { status: 'APPROVED' },
      });
    });

    return json(true, { deposit: updated });
  } catch (e: any) {
    console.error('[api/admin/deposits/[id]] POST error', e);
    return json(false, { error: e?.message || 'Server error' }, 500);
  }
}
