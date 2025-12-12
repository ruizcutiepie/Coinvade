import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET: list withdrawals
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  const user = session?.user as any;

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const withdrawals = await prisma.withdrawRequest.findMany({
    include: {
      user: {
        select: { id: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ ok: true, withdrawals });
}

// PUT: approve / reject / paid
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { id, action } = body;

  if (!id || !action) {
    return NextResponse.json(
      { ok: false, error: 'Invalid payload' },
      { status: 400 }
    );
  }

  let status: string;

  if (action === 'approve') status = 'APPROVED';
  else if (action === 'reject') status = 'REJECTED';
  else if (action === 'paid') status = 'PAID';
  else {
    return NextResponse.json(
      { ok: false, error: 'Invalid action' },
      { status: 400 }
    );
  }

  const withdrawal = await prisma.withdrawRequest.update({
    where: { id },
    data: { status },
    include: {
      user: { select: { id: true, email: true } },
    },
  });

  return NextResponse.json({ ok: true, withdrawal });
}
