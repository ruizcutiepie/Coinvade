// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hash } from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Only email + password, ignore name
    const { email, password } = body ?? {};

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: 'EMAIL_AND_PASSWORD_REQUIRED' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { ok: false, error: 'EMAIL_ALREADY_REGISTERED' },
        { status: 400 }
      );
    }

    const passwordHash = await hash(password, 10);

    const user = await prisma.user.create({
      // 👇 cast as any so TS doesn't complain about passwordHash / role
      data: {
        email,
        passwordHash,
        role: 'USER',
        wallets: {
          create: [
            {
              coin: 'USDT',
              balance: 1000,
            },
          ],
        },
      } as any,
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (err: any) {
    console.error('[REGISTER_ERROR]', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
