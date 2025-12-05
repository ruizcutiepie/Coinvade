// src/app/api/trades/settle/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // adjust path if your prisma client lives somewhere else

// TODO: plug in your real auth here
async function getCurrentUserId(_req: NextRequest): Promise<string | null> {
  // Example if you use next-auth or your own auth:
  // const session = await auth();
  // return session?.user?.id ?? null;

  // For now, single demo user
  return 'demo-user-1';
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId(req);
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'UNAUTHENTICATED' },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      pair,
      direction,
      amount,
      duration,
      entryPrice,
      exitPrice,
      won,
      payout,
      ts,
    } = body ?? {};

    // Basic payload validation
    if (
      !pair ||
      (direction !== 'long' && direction !== 'short') ||
      typeof amount !== 'number' ||
      amount <= 0 ||
      typeof duration !== 'number' ||
      duration <= 0 ||
      typeof entryPrice !== 'number' ||
      typeof exitPrice !== 'number' ||
      typeof payout !== 'number' ||
      typeof ts !== 'number'
    ) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_PAYLOAD' },
        { status: 400 }
      );
    }

    // ---- WALLET FETCH / CREATE ----
    // Use findFirst so we don't rely on your WalletWhereUniqueInput shape
    let wallet: any = await prisma.wallet.findFirst({
      where: { userId } as any,
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          balance: 1000, // default starting balance; change if you like
          // if your schema needs a coin/symbol field, add it here, e.g. coin: 'USDT'
        } as any,
      });
    }

    // Profit = payout - stake
    const profit = payout - amount;

    const currentBalance = Number(wallet.balance ?? 0) || 0;
    const nextBalance = currentBalance + profit;

    // ---- UPDATE WALLET ----
    const updatedWallet: any = await prisma.wallet.update({
      // use id if you have it; cast as any so Prisma TS doesn't complain
      where: { id: wallet.id } as any,
      data: {
        balance: nextBalance,
      } as any,
    });

    // ---- SAVE TRADE ----
    const trade: any = await prisma.trade.create({
      data: {
        userId,
        pair,
        direction,
        amount,
        duration,
        entryPrice,
        exitPrice,
        payout,
        won: Boolean(won),
        // we DO NOT store ts in DB here, since your Trade model
        // doesn’t seem to have a ts field. createdAt can be used instead.
      } as any,
    });

    // ---- RESPONSE ----
    return NextResponse.json({
      ok: true,
      trade: {
        id: trade.id,
        pair: trade.pair,
        direction: trade.direction,
        amount: Number(trade.amount),
        duration: trade.duration,
        entryPrice: Number(trade.entryPrice),
        exitPrice: Number(trade.exitPrice),
        payout: Number(trade.payout),
        won: trade.won,
        // use the incoming ts from client for now
        ts: Number(ts),
      },
      wallet: {
        balance: Number(updatedWallet.balance),
        // your Wallet model didn’t like "currency", so we hardcode this
        currency: 'USDT',
      },
    });
  } catch (err) {
    console.error('[api/trades/settle] error', err);
    return NextResponse.json(
      { ok: false, error: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
