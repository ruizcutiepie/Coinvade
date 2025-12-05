// src/app/api/trade/resolve/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPrice } from '@/lib/binance';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const tradeId = body?.tradeId as string | undefined;

    if (!tradeId) {
      return NextResponse.json(
        { ok: false, error: 'Missing tradeId' },
        { status: 400 },
      );
    }

    // 1) Load trade
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
    });

    if (!trade) {
      return NextResponse.json(
        { ok: false, error: 'Trade not found' },
        { status: 404 },
      );
    }

    // If already has an exitPrice, just return it
    if (trade.exitPrice !== null && trade.exitPrice !== undefined) {
      return NextResponse.json(
        { ok: true, trade, wallet: null },
        { status: 200 },
      );
    }

    // 2) Determine symbol from pair (e.g. "BTCUSDT")
    const symbol = trade.pair;
    if (!symbol) {
      return NextResponse.json(
        { ok: false, error: 'Trade has no pair set' },
        { status: 400 },
      );
    }

    // 3) Current price from Binance helper
    const priceRaw = await getPrice(symbol);
    const currentPrice = Number(priceRaw);

    if (!Number.isFinite(currentPrice)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid current price from price feed' },
        { status: 500 },
      );
    }

    // 4) Entry price and direction
    const entry = Number(trade.entryPrice ?? 0);
    const directionRaw = (trade.direction ?? '').toString().toUpperCase();
    const isLong = directionRaw === 'LONG';
    const isShort = directionRaw === 'SHORT';

    const amount = Number(trade.amount) || 0;

    let wonFlag: boolean | null = null;
    let payout = 0;

    if (currentPrice > entry) {
      // price went up
      wonFlag = isLong ? true : isShort ? false : null;
    } else if (currentPrice < entry) {
      // price went down
      wonFlag = isShort ? true : isLong ? false : null;
    } else {
      // tie
      wonFlag = null;
    }

    if (wonFlag === true) {
      payout = amount * 1.8; // win = stake + 80% profit
    } else if (wonFlag === false) {
      payout = 0; // loss
    } else {
      payout = amount; // tie = refund
    }

    // 5) Transaction: update trade + wallet
    const result = await prisma.$transaction(async (tx) => {
      // update trade
      const updatedTrade = await tx.trade.update({
        where: { id: trade.id },
        data: {
          exitPrice: currentPrice,
          payout,
          won: wonFlag,
        },
      });

      // find or create USDT wallet for this user
      let wallet = await tx.wallet.findFirst({
        where: { userId: trade.userId, coin: 'USDT' },
      });

      if (!wallet) {
        wallet = await tx.wallet.create({
          data: {
            userId: trade.userId,
            coin: 'USDT',
            balance: 0,
          },
        });
      }

      // credit payout if any
      let updatedWallet = wallet;
      if (payout > 0) {
        updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: { increment: payout },
          },
        });
      }

      return {
        trade: updatedTrade,
        wallet: updatedWallet,
      };
    });

    return NextResponse.json(
      {
        ok: true,
        trade: result.trade,
        wallet: result.wallet,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[trade/resolve] error:', error);

    const message =
      error instanceof Error ? error.message : 'Unknown server error';

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
