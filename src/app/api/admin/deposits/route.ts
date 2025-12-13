import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import prisma from '@/lib/prisma';

function pickDepositModel(prismaAny: any) {
  // try common model names (adjust if yours is different)
  const candidates = [
    'deposit',
    'deposits',
    'Deposit',
    'DepositRequest',
    'depositRequest',
    'deposit_request',
    'depositRequests',
  ];

  for (const key of candidates) {
    if (prismaAny?.[key]?.findMany) return prismaAny[key];
  }

  // If none matched, show keys to help debugging (safe)
  const keys = Object.keys(prismaAny || {}).filter((k) => prismaAny?.[k]?.findMany);
  throw new Error(
    `No deposit model found on Prisma client. Available models (findMany): ${keys.join(', ')}`
  );
}

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions as any);
    const user = session?.user as any;

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const prismaAny: any = prisma;
    const DepositModel = pickDepositModel(prismaAny);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const limit = Math.min(Number(searchParams.get('limit') || 50), 200);

    const where = status ? { status } : undefined;

    // Try with include user.email (if relation exists)
    try {
      const deposits = await DepositModel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { user: { select: { email: true } } },
      });

      return NextResponse.json({ ok: true, deposits });
    } catch {
      // Fallback if "user" relation doesn’t exist in your model
      const deposits = await DepositModel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return NextResponse.json({ ok: true, deposits });
    }
  } catch (e: any) {
    console.error('[api/admin/deposits] GET error', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Server error' },
      { status: 500 }
    );
  }
}
