// src/app/api/admin/withdrawals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import prisma from '@/lib/prisma';

function json(ok: boolean, data: any, status = 200) {
  return NextResponse.json({ ok, ...data }, { status });
}

async function requireAdmin() {
  const session = (await getServerSession(authOptions as any)) as any;
  const user = session?.user as any;
  if (!user || user.role !== 'ADMIN') {
    return { ok: false as const, error: 'Unauthorized' };
  }
  return { ok: true as const, user };
}

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return json(false, { error: admin.error }, 401);

    const url = new URL(req.url);
    const status = url.searchParams.get('status'); // optional
    const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200);

    const where: any = {};
    if (status) where.status = String(status).toUpperCase();

    const withdrawals = await prisma.withdrawRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, email: true } },
      },
    });

    return json(true, { withdrawals });
  } catch (e: any) {
    console.error('[api/admin/withdrawals] GET error', e);
    return json(false, { error: e?.message || 'Server error' }, 500);
  }
}

// Admin actions used by your admin page:
// PUT /api/admin/withdrawals  body: { id, action: "approve"|"reject"|"paid" }
export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return json(false, { error: admin.error }, 401);

    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || '').trim();
    const action = String(body?.action || '').toLowerCase();

    if (!id) return json(false, { error: 'Missing id' }, 400);
    if (!['approve', 'reject', 'paid'].includes(action)) {
      return json(false, { error: 'Invalid action' }, 400);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const w = await tx.withdrawRequest.findUnique({ where: { id } });
      if (!w) throw new Error('Withdrawal not found');

      const current = String(w.status || '').toUpperCase();

      // Guardrails
      if (action === 'approve' && current !== 'PENDING') {
        throw new Error(`Only PENDING can be approved (currently ${current})`);
      }
      if (action === 'paid' && current !== 'APPROVED') {
        throw new Error(`Only APPROVED can be marked PAID (currently ${current})`);
      }
      if (action === 'reject' && !['PENDING', 'APPROVED'].includes(current)) {
        throw new Error(`Cannot reject when status is ${current}`);
      }

      if (action === 'reject') {
        // ✅ refund reserved funds back to wallet
        const wallet = await tx.wallet.findFirst({
          where: { userId: w.userId, coin: String(w.coin).toUpperCase() },
        });

        if (wallet) {
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: w.amount } },
          });
        } else {
          // If wallet row doesn't exist, create it with refunded balance
          await tx.wallet.create({
            data: {
              userId: w.userId,
              coin: String(w.coin).toUpperCase(),
              balance: w.amount,
            },
          });
        }

        return tx.withdrawRequest.update({
          where: { id },
          data: { status: 'REJECTED' },
          include: { user: { select: { id: true, email: true } } },
        });
      }

      if (action === 'approve') {
        return tx.withdrawRequest.update({
          where: { id },
          data: { status: 'APPROVED' },
          include: { user: { select: { id: true, email: true } } },
        });
      }

      // action === 'paid'
      return tx.withdrawRequest.update({
        where: { id },
        data: { status: 'PAID' },
        include: { user: { select: { id: true, email: true } } },
      });
    });

    return json(true, { withdrawal: updated });
  } catch (e: any) {
    console.error('[api/admin/withdrawals] PUT error', e);
    return json(false, { error: e?.message || 'Server error' }, 500);
  }
}
