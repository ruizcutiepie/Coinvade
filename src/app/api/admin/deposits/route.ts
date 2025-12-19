// src/app/api/admin/deposits/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import prisma from '@/lib/prisma';

function json(ok: boolean, data: any, status = 200) {
  return NextResponse.json({ ok, ...data }, { status });
}

const ALLOWED_STATUSES = ['PENDING', 'CONFIRMED', 'FAILED'] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

function normalizeStatus(input: unknown): AllowedStatus | null {
  const s = String(input || '').trim().toUpperCase();
  if ((ALLOWED_STATUSES as readonly string[]).includes(s)) return s as AllowedStatus;
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    const actor = session?.user as any;

    if (!actor?.id) return json(false, { error: 'Unauthorized' }, 401);
    if (String(actor.role || '').toUpperCase() !== 'ADMIN') {
      return json(false, { error: 'Forbidden' }, 403);
    }

    const { searchParams } = new URL(req.url);

    // Example: /api/admin/deposits?status=PENDING
    const statusParam = searchParams.get('status');
    const status = statusParam ? normalizeStatus(statusParam) : null;

    const deposits = await prisma.depositIntent.findMany({
      // Prisma expects enum type here. We validated, then cast safely.
      where: status ? ({ status: status as any } as any) : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true } },
      },
      take: 200,
    });

    return json(true, { deposits }, 200);
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Server error';
    console.error('[api/admin/deposits] GET error:', error);
    return json(false, { error: message }, 500);
  }
}
