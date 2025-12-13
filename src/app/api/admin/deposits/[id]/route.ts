import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ TS-safe: cast session to any so .user is accessible
    const session = (await getServerSession(authOptions as any)) as any;
    const user = session?.user as any;

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
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

    const deposit = await prisma.depositIntent.findUnique({ where: { id } });
    if (!deposit) {
      return NextResponse.json(
        { ok: false, error: 'Deposit not found' },
        { status: 404 }
      );
    }

    if (deposit.status !== 'PENDING') {
      return NextResponse.json(
        { ok: false, error: `Deposit already ${deposit.status}` },
        { status: 400 }
      );
    }

    // Update deposit status
    const updated = await prisma.depositIntent.update({
      where: { id },
      data: { status: action === 'APPROVE' ? 'CONFIRMED' : 'FAILED' },
    });

    // If approved, credit wallet
    if (action === 'APPROVE') {
      const amount = updated.amount ?? 0;

      if (amount > 0) {
        await prisma.wallet.upsert({
          where: {
            userId_coin: { userId: updated.userId, coin: updated.coin },
          },
          create: {
            userId: updated.userId,
            coin: updated.coin,
            balance: amount,
          },
          update: {
            balance: { increment: amount },
          },
        });
      }
    }

    return NextResponse.json({ ok: true, deposit: updated });
  } catch (e: any) {
    console.error('[admin deposits] error', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Server error' },
      { status: 500 }
    );
  }
}
