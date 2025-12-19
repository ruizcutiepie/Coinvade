// src/app/api/trade/open/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getPrice } from '@/lib/binance';

function json(ok: boolean, data: any, status = 200) {
  return NextResponse.json({ ok, ...data }, { status });
}

function toNumber(v: any): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    const user = session?.user as any;
    if (!user?.id) return json(false, { error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({} as any));

    const pair = String(body?.pair || 'BTCUSDT').toUpperCase();
    const direction = String(body?.direction || 'LONG').toUpperCase(); // LONG/SHORT
    const amount = toNumber(body?.amount);
    const duration = Math.floor(toNumber(body?.duration || 60));

    if (!pair.endsWith('USDT')) return json(false, { error: 'Only USDT pairs supported' }, 400);
    if (direction !== 'LONG' && direction !== 'SHORT')
      return json(false, { error: 'Invalid direction' }, 400);
    if (!Number.isFinite(amount) || amount <= 0) return json(false, { error: 'Invalid amount' }, 400);
    if (!Number.isFinite(duration) || duration <= 0) return json(false, { error: 'Invalid duration' }, 400);

    const created = await prisma.$transaction(async (tx) => {
      // Ensure USDT wallet exists
      const wallet = await tx.wallet.upsert({
        where: { userId_coin: { userId: user.id, coin: 'USDT' } },
        update: {},
        create: { userId: user.id, coin: 'USDT', balance: 0 },
      });

      const bal = toNumber(wallet.balance);
      if (bal < amount) {
        const err: any = new Error('Insufficient balance');
        err.status = 400;
        throw err;
      }

      // Deduct stake immediately (Float-safe)
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      });

      // Entry price from server feed
      const entryPrice = Number(await getPrice(pair));
      if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
        throw new Error('Invalid entry price');
      }

      const trade = await tx.trade.create({
        data: {
          userId: user.id,
          pair,
          direction,
          amount,
          duration,
          entryPrice,
          payout: 0,
          won: null,
        },
      });

      const freshWallet = await tx.wallet.findUnique({ where: { id: wallet.id } });

      return { trade, wallet: freshWallet };
    });

    return json(true, { trade: created.trade, wallet: created.wallet }, 200);
  } catch (e: any) {
    const status = e?.status || 500;
    const msg = String(e?.message || 'Server error');
    console.error('[api/trade/open] POST error', e);
    return json(false, { error: msg }, status);
  }
}
