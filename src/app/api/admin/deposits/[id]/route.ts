// src/app/api/admin/deposits/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import prisma from '@/lib/prisma';

function json(ok: boolean, data: any, status = 200) {
  return NextResponse.json({ ok, ...data }, { status });
}

// NOTE:
// Your prisma/schema.prisma DepositStatus enum is:
// PENDING | CONFIRMED | FAILED
// Some environments don't export DepositStatus type directly from @prisma/client,
// so we use string literals to avoid build/type mismatch.

type DepositStatusStr = 'PENDING' | 'CONFIRMED' | 'FAILED';

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    const actor = session?.user as any;

    if (!actor?.id) return json(false, { error: 'Unauthorized' }, 401);
    if (actor.role !== 'ADMIN') return json(false, { error: 'Forbidden' }, 403);

    const id = String(ctx?.params?.id || '');
    if (!id) return json(false, { error: 'Missing id' }, 400);

    const body = await req.json().catch(() => ({} as any));
    const action = String(body?.action || '').toLowerCase();

    if (!action) return json(false, { error: 'Missing action' }, 400);

    const result = await prisma.$transaction(async (tx) => {
      const dep = await tx.depositIntent.findUnique({ where: { id } });
      if (!dep) {
        const err: any = new Error('Deposit not found');
        err.status = 404;
        throw err;
      }

      const currentStatus = String((dep as any).status || '') as DepositStatusStr;

      // Only allow transitions from PENDING
      if (currentStatus !== 'PENDING') {
        return dep; // idempotent-ish
      }

      if (action === 'confirm') {
        return await tx.depositIntent.update({
          where: { id },
          data: { status: 'CONFIRMED' as any },
        });
      }

      if (action === 'fail' || action === 'reject') {
        // "reject" maps to FAILED because enum has no REJECTED
        return await tx.depositIntent.update({
          where: { id },
          data: { status: 'FAILED' as any },
        });
      }

      return dep;
    });

    return json(true, { deposit: result }, 200);
  } catch (error: any) {
    const status = error?.status || 500;
    const message = error instanceof Error ? error.message : 'Server error';
    console.error('[api/admin/deposits/[id]] error:', error);
    return json(false, { error: message }, status);
  }
}
