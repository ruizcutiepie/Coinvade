import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions as any);
  const user = (session as any)?.user;

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const withdrawals = await prisma.withdrawRequest.findMany({
    include: {
      user: { select: { id: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return NextResponse.json({ ok: true, withdrawals });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions as any);
  const user = (session as any)?.user;

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { id, action } = await req.json();

  const statusMap: Record<string, string> = {
    approve: 'APPROVED',
    reject: 'REJECTED',
    paid: 'PAID',
  };

  const nextStatus = statusMap[action];
  if (!nextStatus) {
    return NextResponse.json(
      { ok: false, error: 'Invalid action' },
      { status: 400 }
    );
  }

  const withdrawal = await prisma.withdrawRequest.update({
    where: { id },
    data: { status: nextStatus },
    include: {
      user: { select: { id: true, email: true } },
    },
  });

  return NextResponse.json({ ok: true, withdrawal });
}
