// src/app/api/admin/users/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import authOptions from '@/lib/auth';
import prisma from '@/lib/prisma';
import { toNumber } from '@/lib/money';

function isAdmin(session: any) {
  return session?.user?.role === 'ADMIN';
}

function normalizeUser(u: any) {
  const w = Array.isArray(u.wallets) ? u.wallets[0] : null;
  const balance = w?.balance != null ? toNumber(w.balance) : 0;

  return {
    ...u,
    wallets: [{ coin: 'USDT', balance }],
  };
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
          where: { coin: 'USDT' }, // only USDT shown in this endpoint
          select: { coin: true, balance: true },
          take: 1,
        },
      },
      take: 500,
    });

    return NextResponse.json({ ok: true, users: users.map(normalizeUser) });
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

    return NextResponse.json({ ok: true, user: normalizeUser(updated) });
  } catch (e) {
    console.error('[api/admin/users][PUT]', e);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}