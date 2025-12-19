// src/app/api/admin/deposits/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import prisma from '@/lib/prisma';

function json(ok: boolean, data: any, status = 200) {
  return NextResponse.json({ ok, ...data }, { status });
}

/**
 * Admin endpoint to update a deposit intent.
 * IMPORTANT: Your schema enum DepositStatus = PENDING | CONFIRMED | FAILED
 * There is NO "REJECTED" for deposits.
 *
 * Supported actions:
 * - "confirm"  -> status = CONFIRMED
 * - "fail"     -> status = FAILED
 * - "reject"   -> treated as "fail" for backwards compatibility
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    const actor = session?.user as any;

    if (!actor?.id) return json(false, { error: 'Unauthorized' }, 401);
    if (String(actor.role || '').toUpperCase() !== 'ADMIN') {
      return json(false, { error: 'Forbidden' }, 403);
    }

    const params = 'then' in (ctx as any).params ? await (ctx as any).params : (ctx as any).params;
    const id = String(params?.id || '');
    if (!id) return json(false, { error: 'Missing deposit id' }, 400);

    const body = await req.json().catch(() => ({} as any));
    const rawAction = String(body?.action || body?.status || '').toLowerCase();

    // normalize action
    const action =
      rawAction === 'confirm'
        ? 'confirm'
        : rawAction === 'fail' || rawAction === 'failed'
        ? 'fail'
        : rawAction === 'reject' || rawAction === 'rejected'
        ? 'fail' // deposits don't have REJECTED, map to FAILED
        : '';

    if (!action) {
      return json(false, { error: 'Invalid action. Use { action: "confirm" | "fail" }' }, 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const dep = await tx.depositIntent.findUnique({ where: { id } });
      if (!dep) {
        const err: any = new Error('Deposit not found');
        err.status = 404;
        throw err;
      }

      // Idempotency: if already CONFIRMED/FAILED, just return as-is
      const currentStatus = String((dep as any).status || '').toUpperCase();
      if (currentStatus === 'CONFIRMED' || currentStatus === 'FAILED') {
        return dep;
      }

      const nextStatus = action === 'confirm' ? 'CONFIRMED' : 'FAILED';

      // NOTE: We cast to any to avoid TS mismatch if Prisma enum export typing is strict.
      // This is safe because it matches your schema enum values.
      const updated = await tx.depositIntent.update({
        where: { id },
        data: { status: nextStatus as any },
      });

      // Optional: if you want CONFIRMED deposits to credit wallet, do it here.
      // Right now we ONLY update status (fastest unblock for production build).

      return updated;
    });

    return json(true, { deposit: result }, 200);
  } catch (error: any) {
    const status = error?.status || 500;
    const message = error instanceof Error ? error.message : 'Server error';
    console.error('[api/admin/deposits/[id]] error:', error);
    return json(false, { error: message }, status);
  }
}
