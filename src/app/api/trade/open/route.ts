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
    const session = (await getServerSession(authOptions as any)) as any;
    const user = session?.user as any;
    if (!user?.id) return json(false, { error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));

    const pair = String(body?.pair || 'BTCUSDT').toUpperCase();
    const direction = String(body?.direction || 'LONG').toUpperCase(); // LONG/SHORT
    const amount = Number(body?.amount || 0); // stake in USDT
    const duration = Number(body?.duration || 60); // seconds

    if (!pair.endsWith('USDT'))
      return json(false, { error: 'Only USDT pairs supported' }, 400);
    if (direction !== 'LONG' && direction !== 'SHORT')
      return json(false, { error: 'Invalid direction' }, 400);
    if (!Number.isFinite(amount) || amount <= 0)
      return json(false, { error: 'Invalid amount' }, 400);
    if (!Number.isFinite(duration) || duration <= 0)
      return json(false, { error: 'Invalid duration' }, 400);

    const created = await prisma.$transaction(async (tx) => {
      // Ensure wallet exists (USDT)
      const wallet = await tx.wallet.upsert({
        where: { userId_coin: { userId: user.id, coin: 'USDT' } },
        update: {},
        create: { userId: user.id, coin: 'USDT', balance: 0 },
      });

      const balance = Number((wallet as any).balance ?? 0);
      if (!Number.isFinite(balance) || balance < amount) {
        const err: any = new Error('Insufficient balance');
        err.status = 400;
        throw err;
      }

      // Deduct stake immediately
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      });

      // If UI did not send entryPrice, fetch it now (so resolve is reliable)
      let entryPrice: number | null =
        body?.entryPrice != null ? Number(body.entryPrice) : null;

      if (entryPrice == null || !Number.isFinite(entryPrice) || entryPrice <= 0) {
        const p = Number(await getPrice(pair));
        if (!Number.isFinite(p) || p <= 0) throw new Error('Failed to fetch entry price');
        entryPrice = p;
      }

      // Create trade
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
          exitPrice: null,
          closePrice: null,
          resolvedAt: null,
        },
      });

      return { trade, wallet: updatedWallet };
    });

    return json(true, { trade: created.trade, wallet: created.wallet });
  } catch (e: any) {
    const status = e?.status || 500;
    const msg = String(e?.message || 'Server error');
    console.error('[api/trade/open] POST error', e);
    return json(false, { error: msg }, status);
  }
}
