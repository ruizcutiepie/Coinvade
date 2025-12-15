// src/app/api/withdraw-request/route.ts
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
    const user = session?.user as any;

    if (!user?.id) return json(false, { error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));

    const coin = String(body?.coin || 'USDT').toUpperCase();
    const network = String(body?.network || '').trim();
    const address = String(body?.address || '').trim();
    const note =
      body?.note != null && String(body.note).trim()
        ? String(body.note).trim()
        : null;

    const amount = Number(body?.amount || 0);

    if (!address) return json(false, { error: 'Address is required' }, 400);
    if (!network) return json(false, { error: 'Network is required' }, 400);
    if (!Number.isFinite(amount) || amount <= 0) {
      return json(false, { error: 'Invalid amount' }, 400);
    }

    const created = await prisma.$transaction(async (tx) => {
      // Find wallet for this coin
      const wallet = await tx.wallet.findFirst({
        where: { userId: user.id, coin },
      });

      const balance = Number(wallet?.balance ?? 0);
      if (!wallet || balance < amount) {
        throw new Error('Insufficient balance');
      }

      // ✅ reserve funds immediately
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      });

      // ✅ create the request
      const w = await tx.withdrawRequest.create({
        data: {
          userId: user.id,
          coin,
          network,
          address,
          amount,
          note,
          status: 'PENDING',
        },
        include: {
          user: { select: { email: true } },
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
    console.error('[api/withdraw-request] error', e);
    return json(false, { error: msg }, 500);
  }
}
