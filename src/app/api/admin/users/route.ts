// src/app/api/admin/users/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import authOptions from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function isAdmin(session: any) {
  return session?.user?.role === 'ADMIN';
}

function decToNumber(v: any): number {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'object') {
    // Prisma Decimal has .toNumber()
    if (typeof (v as any).toNumber === 'function') {
      const n = (v as any).toNumber();
      return Number.isFinite(n) ? n : 0;
    }
    // some decimals stringify cleanly
    const n = Number(String(v));
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// GET /api/admin/users
export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as any;

    if (!isAdmin(session)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        wallets: {
          where: { coin: 'USDT' },
          select: { coin: true, balance: true },
          take: 1,
        },
      },
      take: 500,
    });

    const normalized = users.map((u) => ({
      ...u,
      wallets: (u.wallets || []).map((w) => ({
        coin: w.coin,
        balance: decToNumber((w as any).balance),
      })),
    }));

    return NextResponse.json({ ok: true, users: normalized });
  } catch (e) {
    console.error('[api/admin/users][GET]', e);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

// PUT /api/admin/users  { id, role }
export async function PUT(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;

    if (!isAdmin(session)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const id = String(body?.id || '');
    const role = String(body?.role || '').toUpperCase();

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Missing user id' }, { status: 400 });
    }
    if (role !== 'ADMIN' && role !== 'USER') {
      return NextResponse.json({ ok: false, error: 'Invalid role' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        wallets: {
          where: { coin: 'USDT' },
          select: { coin: true, balance: true },
          take: 1,
        },
      },
    });

    const normalized = {
      ...updated,
      wallets: (updated.wallets || []).map((w) => ({
        coin: w.coin,
        balance: decToNumber((w as any).balance),
      })),
    };

    return NextResponse.json({ ok: true, user: normalized });
  } catch (e) {
    console.error('[api/admin/users][PUT]', e);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}