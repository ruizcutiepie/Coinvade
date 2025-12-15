import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import prisma from '@/lib/prisma';

function json(ok: boolean, data: any, status = 200) {
  return NextResponse.json({ ok, ...data }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    const user = session?.user as any;

    if (!user || user.role !== 'ADMIN') {
      return json(false, { error: 'Unauthorized' }, 401);
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status'); // PENDING / APPROVED / PAID / REJECTED
    const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200);

    const where: any = {};
    if (status) where.status = String(status).toUpperCase();

    // IMPORTANT: model name must match Prisma Studio: WithdrawRequest
    const withdrawals = await prisma.withdrawRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { email: true } },
      },
    });

    return json(true, { withdrawals });
  } catch (e: any) {
    console.error('[api/admin/withdrawals] GET error', e);
    return json(false, { error: e?.message || 'Server error' }, 500);
  }
}
