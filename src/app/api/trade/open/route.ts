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
    let entryPrice = body?.entryPrice != null ? Number(body.entryPrice) : null;

    if (!pair.endsWith('USDT')) return json(false, { error: 'Only USDT pairs supported' }, 400);
    if (direction !== 'LONG' && direction !== 'SHORT') return json(false, { error: 'Invalid direction' }, 400);
    if (!Number.isFinite(amount) || amount <= 0) return json(false, { error: 'Invalid amount' }, 400);
    if (!Number.isFinite(duration) || duration <= 0) return json(false, { error: 'Invalid duration' }, 400);

    // ✅ If client doesn't provide entryPrice, fetch it here so resolve will work.
    if (!Number.isFinite(entryPrice as any) || (entryPrice as any) <= 0) {
      const p = Number(await getPrice(pair));
      if (!Number.isFinite(p) || p <= 0) {
        return json(false, { error: 'Failed to fetch entry price' }, 500);
      }
      entryPrice = p;
    }

    const created = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId_coin: { userId: user.id, coin: 'USDT' } },
        update: {},
        create: { userId: user.id, coin: 'USDT', balance: 0 },
      });

      const balance = Number((wallet as any).balance ?? 0);
      if (!Number.isFinite(balance) || balance < amount) {
        throw new Error('Insufficient balance');
      }

      // ✅ Deduct stake immediately
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      });

      const trade = await tx.trade.create({
        data: {
          userId: user.id,
          pair,
          direction,
          amount,
          duration,
          entryPrice: entryPrice ?? null,
          payout: 0,
          won: null,
        },
      });

      const freshWallet = await tx.wallet.findUnique({ where: { id: wallet.id } });
      return { trade, wallet: freshWallet };
    });

    return json(true, { trade: created.trade, wallet: created.wallet });
  } catch (e: any) {
    const msg = String(e?.message || 'Server error');
    if (msg.toLowerCase().includes('insufficient')) return json(false, { error: msg }, 400);
    console.error('[api/trade/open] POST error', e);
    return json(false, { error: msg }, 500);
  }
}
