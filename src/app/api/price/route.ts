// src/app/api/price/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = String(searchParams.get('symbol') || '').trim().toUpperCase();

  if (!symbol) {
    return NextResponse.json({ ok: false, error: 'Missing symbol' }, { status: 400 });
  }

  // Binance public endpoint (no key required)
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol)}`;

  try {
    const r = await fetch(url, {
      cache: 'no-store',
      headers: { 'User-Agent': 'coinvade/1.0' },
    });

    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return NextResponse.json(
        { ok: false, error: `Upstream error (${r.status})`, detail: t.slice(0, 180) },
        { status: 502 }
      );
    }

    const j: any = await r.json();

    const lastPrice = num(j?.lastPrice);
    const changePct = num(j?.priceChangePercent);

    return NextResponse.json({
      ok: true,
      symbol,
      price: lastPrice, // <-- your Wallet expects data.price
      changePct,        // <-- your TickerCard supports this
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'Fetch failed', detail: String(e?.message || e) },
      { status: 502 }
    );
  }
}
