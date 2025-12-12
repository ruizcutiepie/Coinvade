import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

// IMPORTANT:
// Use the SAME export style you already use in your project.
// If your auth file exports default: `export default authOptions` -> keep this import
import authOptions from '@/lib/auth';

function isAdmin(session: any) {
  return !!session?.user && session.user.role === 'ADMIN';
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions as any);
  if (!isAdmin(session)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status'); // optional

  const deposits = await prisma.depositIntent.findMany({
    where: status ? { status } : undefined,
    include: { user: { select: { id: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return NextResponse.json({ ok: true, deposits });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions as any);
  if (!isAdmin(session)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = body?.id as string | undefined;
  const action = body?.action as 'approve' | 'reject' | undefined;

  if (!id || !action) {
    return NextResponse.json({ ok: false, error: 'Missing id/action' }, { status: 400 });
  }

  // Load deposit first
  const dep = await prisma.depositIntent.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!dep) {
    return NextResponse.json({ ok: false, error: 'Deposit not found' }, { status: 404 });
  }

  // Approve = CONFIRMED and credit wallet (requires amount)
  if (action === 'approve') {
    if (dep.status === 'CONFIRMED') {
      return NextResponse.json({ ok: true, deposit: dep }); // already done
    }
    if (dep.amount == null || Number(dep.amount) <= 0) {
      return NextResponse.json(
        { ok: false, error: 'Cannot approve deposit without a valid amount' },
        { status: 400 }
      );
    }

    const [updated] = await prisma.$transaction([
      prisma.depositIntent.update({
        where: { id },
        data: { status: 'CONFIRMED' },
        include: { user: { select: { id: true, email: true } } },
      }),
      prisma.wallet.upsert({
        where: { userId_coin: { userId: dep.userId, coin: dep.coin } },
        create: { userId: dep.userId, coin: dep.coin, balance: dep.amount },
        update: { balance: { increment: dep.amount } },
      }),
    ]);

    return NextResponse.json({ ok: true, deposit: updated });
  }

  // Reject = FAILED (no wallet changes)
  if (action === 'reject') {
    const updated = await prisma.depositIntent.update({
      where: { id },
      data: { status: 'FAILED' },
      include: { user: { select: { id: true, email: true } } },
    });

    return NextResponse.json({ ok: true, deposit: updated });
  }

  return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 });
}
