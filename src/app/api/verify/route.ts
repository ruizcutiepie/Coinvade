// src/app/api/verify/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const fullName = String(body?.fullName || '').trim();
    const country = String(body?.country || '').trim();
    const docType = String(body?.docType || '').trim();
    const docNumber = String(body?.docNumber || '').trim();

    if (!fullName || !country || !docType || !docNumber) {
      return NextResponse.json({ ok: false, error: 'Missing required fields.' }, { status: 400 });
    }

    // Demo accept (extend later to DB)
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  }
}
