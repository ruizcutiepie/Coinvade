// src/app/api/wallet/withdraw/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

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

function toDecimal(n: number) {
  return new Prisma.Decimal(Number.isFinite(n) ? n : 0);
}

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    const actor = session?.user as any;
    if (!actor?.id) return json(false, { error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({} as any));

    const coin = String(body?.coin || 'USDT').toUpperCase();
    const network = String(body?.network || '').trim();
    const address = String(body?.address || '').trim();
    const amount = Number(body?.amount || 0);
    const note = body?.note != null ? String(body.note) : null;

    if (!coin) return json(false, { error: 'Missing coin' }, 400);
    if (!network) return json(false, { error: 'Missing network' }, 400);
    if (!address) return json(false, { error: 'Missing address' }, 400);
    if (!Number.isFinite(amount) || amount <= 0) {
      return json(false, { error: 'Invalid amount' }, 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      // ensure wallet exists
      const wallet = await tx.wallet.upsert({
        where: { userId_coin: { userId: actor.id, coin } },
        update: {},
        create: { userId: actor.id, coin, balance: toDecimal(0) as any },
      });

      const bal = toNumber(wallet.balance);

      // ✅ FIX: compare number-to-number
      if (bal < amount) {
        const err: any = new Error('Insufficient balance');
        err.status = 400;
        throw err;
      }

      // create withdrawal request
      const withdrawal = await tx.withdrawRequest.create({
        data: {
          userId: actor.id,
          coin,
          network,
          address,
          amount: toDecimal(amount) as any,
          note: note || undefined,
          // ✅ DO NOT import enum type — keep this stable
          status: 'PENDING' as any,
        } as any,
      });

      // deduct wallet (reserve funds)
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: toDecimal(amount) as any } },
      });

      return { withdrawal, wallet: updatedWallet };
    });

    return json(true, { withdrawal: result.withdrawal, wallet: result.wallet }, 200);
  } catch (e: any) {
    const status = e?.status || 500;
    const msg = String(e?.message || 'Server error');
    console.error('[api/wallet/withdraw] POST error', e);
    return json(false, { error: msg }, status);
  }
}
