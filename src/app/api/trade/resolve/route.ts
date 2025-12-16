import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getPrice } from '@/lib/binance';

function json(ok: boolean, data: any, status = 200) {
  return NextResponse.json({ ok, ...data }, { status });
}

export async function POST(req: NextRequest) {
  try {
    // ✅ auth required
    const session = (await getServerSession(authOptions as any)) as any;
    const actor = session?.user as any;
    if (!actor?.id) return json(false, { error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({} as any));
    const tradeId = String(body?.tradeId || '');

    if (!tradeId) return json(false, { error: 'Missing tradeId' }, 400);

    const result = await prisma.$transaction(async (tx) => {
      const trade = await tx.trade.findUnique({ where: { id: tradeId } });
      if (!trade) throw new Error('Trade not found');

      // ✅ only owner or admin can resolve
      if (trade.userId !== actor.id && actor.role !== 'ADMIN') {
        const err: any = new Error('Forbidden');
        err.status = 403;
        throw err;
      }

      // ✅ idempotent (no double-credit)
      if (trade.exitPrice != null || trade.won != null) {
        const wallet = await tx.wallet.findUnique({
          where: { userId_coin: { userId: trade.userId, coin: 'USDT' } },
        });
        return { trade, wallet };
      }

      const symbol = trade.pair;
      if (!symbol) throw new Error('Trade has no pair set');

      const currentPrice = Number(await getPrice(symbol));
      if (!Number.isFinite(currentPrice)) {
        throw new Error('Invalid current price from price feed');
      }

      const entry = Number(trade.entryPrice ?? 0);
      if (!Number.isFinite(entry) || entry <= 0) {
        throw new Error('Missing entryPrice on trade');
      }

      const direction = String(trade.direction || '').toUpperCase();
      const isLong = direction === 'LONG';
      const isShort = direction === 'SHORT';
      if (!isLong && !isShort) throw new Error('Invalid direction on trade');

      const stake = Number(trade.amount) || 0;

      // ✅ outcome
      let wonFlag: boolean | null = null;
      if (currentPrice > entry) wonFlag = isLong ? true : false;
      else if (currentPrice < entry) wonFlag = isShort ? true : false;
      else wonFlag = null; // tie

      // ✅ payout assumes the stake was already deducted on "place trade"
      let payout = 0;
      if (wonFlag === true) payout = stake * 1.8; // stake + 80% profit
      else if (wonFlag === false) payout = 0;
      else payout = stake; // tie = refund

      const updatedTrade = await tx.trade.update({
        where: { id: trade.id },
        data: {
          exitPrice: currentPrice,
          closePrice: currentPrice,
          payout,
          won: wonFlag,
          resolvedAt: new Date(),
        },
      });

      // ✅ credit payout
      let wallet = await tx.wallet.upsert({
        where: { userId_coin: { userId: trade.userId, coin: 'USDT' } },
        update: {},
        create: { userId: trade.userId, coin: 'USDT', balance: 0 },
      });

      if (payout > 0) {
        wallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: payout } },
        });
      }

      return { trade: updatedTrade, wallet };
    });

    return json(true, { trade: result.trade, wallet: result.wallet }, 200);
  } catch (error: any) {
    const status = error?.status || 500;
    const message = error instanceof Error ? error.message : 'Server error';
    console.error('[api/trade/resolve] error:', error);
    return json(false, { error: message }, status);
  }
}
