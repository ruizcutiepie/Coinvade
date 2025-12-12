// src/app/api/admin/withdrawals/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import prisma from '@/lib/prisma';

async function requireAdmin() {
  const session = (await getServerSession(authOptions as any)) as any;
  const user = session?.user;
  if (!user) return { ok: false as const, status: 401 as const };
  if (user.role !== 'ADMIN') return { ok: false as const, status: 403 as const };
  return { ok: true as const };
}

// GET: list withdrawals (latest first)
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: guard.status });
  }

  const rows = await prisma.withdrawRequest.findMany({
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });

  return NextResponse.json({
    ok: true,
    withdrawals: rows.map((w) => ({
      id: w.id,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
      status: w.status,
      coin: w.coin,
      network: w.network,
      address: w.address,
      amount: w.amount,
      note: w.note,
      user: {
        id: w.userId,
        email: w.user?.email ?? null,
      },
    })),
  });
}

// PUT: update status (approve / reject / paid)
export async function PUT(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: guard.status });
  }

  const body = await req.json().catch(() => null);
  const id = body?.id as string | undefined;
  const action = body?.action as 'approve' | 'reject' | 'paid' | undefined;

  if (!id || !action) {
    return NextResponse.json({ ok: false, error: 'Missing id/action' }, { status: 400 });
  }

  const existing = await prisma.withdrawRequest.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  // Basic state rules
  const current = existing.status;

  let nextStatus: string | null = null;
  if (action === 'approve') {
    if (current !== 'PENDING') {
      return NextResponse.json({ ok: false, error: 'Only PENDING can be approved' }, { status: 400 });
    }
    nextStatus = 'APPROVED';
  }

  if (action === 'reject') {
    if (current !== 'PENDING') {
      return NextResponse.json({ ok: false, error: 'Only PENDING can be rejected' }, { status: 400 });
    }
    nextStatus = 'REJECTED';
  }

  if (action === 'paid') {
    if (current !== 'APPROVED') {
      return NextResponse.json({ ok: false, error: 'Only APPROVED can be marked PAID' }, { status: 400 });
    }
    nextStatus = 'PAID';
  }

  const updated = await prisma.withdrawRequest.update({
    where: { id },
    data: { status: nextStatus! },
    include: { user: true },
  });

  return NextResponse.json({
    ok: true,
    withdrawal: {
      id: updated.id,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      status: updated.status,
      coin: updated.coin,
      network: updated.network,
      address: updated.address,
      amount: updated.amount,
      note: updated.note,
      user: {
        id: updated.userId,
        email: updated.user?.email ?? null,
      },
    },
  });
}
