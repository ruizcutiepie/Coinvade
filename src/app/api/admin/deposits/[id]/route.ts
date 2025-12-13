import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import prisma from '@/lib/prisma';

function pickDepositModel(prismaAny: any) {
  const candidates = [
    'deposit',
    'deposits',
    'Deposit',
    'DepositRequest',
    'depositRequest',
    'deposit_request',
    'depositRequests',
  ];

  for (const key of candidates) {
    if (prismaAny?.[key]?.findUnique) return prismaAny[key];
  }

  const keys = Object.keys(prismaAny || {}).filter((k) => prismaAny?.[k]?.findUnique);
  throw new Error(
    `No deposit model found on Prisma client. Available models (findUnique): ${keys.join(', ')}`
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session: any = await getServerSession(authOptions as any);
    const user = session?.user as any;

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '').toUpperCase();

    if (action !== 'APPROVE' && action !== 'REJECT') {
      return NextResponse.json(
        { ok: false, error: "Invalid action. Use 'APPROVE' or 'REJECT'." },
        { status: 400 }
      );
    }

    const prismaAny: any = prisma;
    const DepositModel = pickDepositModel(prismaAny);

    const deposit = await DepositModel.findUnique({ where: { id } });

    if (!deposit) {
      return NextResponse.json({ ok: false, error: 'Deposit not found' }, { status: 404 });
    }

    if (deposit.status !== 'PENDING') {
      return NextResponse.json(
        { ok: false, error: 'Deposit already processed' },
        { status: 400 }
      );
    }

    if (action === 'REJECT') {
      const updated = await DepositModel.update({
        where: { id },
        data: { status: 'REJECTED' },
      });
      return NextResponse.json({ ok: true, deposit: updated });
    }

    // APPROVE: mark approved + credit wallet
    const updated = await prisma.$transaction(async (tx) => {
      const updatedDeposit = await (tx as any)[DepositModel._model || 'deposit']?.update?.({
        where: { id },
        data: { status: 'APPROVED' },
      }).catch(async () => {
        // fallback: use DepositModel outside tx if tx model name isn't accessible
        return await DepositModel.update({ where: { id }, data: { status: 'APPROVED' } });
      });

      // Wallet upsert (requires unique composite userId_coin in schema)
      // If your wallet unique key name differs, update the `where` block.
      await tx.wallet.upsert({
        where: {
          userId_coin: {
            userId: deposit.userId,
            coin: deposit.coin,
          },
        },
        create: {
          userId: deposit.userId,
          coin: deposit.coin,
          balance: deposit.amount ?? 0,
        },
        update: {
          balance: { increment: deposit.amount ?? 0 },
        },
      });

      return updatedDeposit;
    });

    return NextResponse.json({ ok: true, deposit: updated });
  } catch (e: any) {
    console.error('[api/admin/deposits/[id]] POST error', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Server error' },
      { status: 500 }
    );
  }
}
