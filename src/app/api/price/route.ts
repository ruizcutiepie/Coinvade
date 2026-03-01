// src/app/api/price/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseSymbolsParam(raw: string) {
  const s = raw.trim();
  if (!s) return [];

  // Accept JSON array string too
  if (s.startsWith('[')) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) {
        return arr
          .map((x) => String(x).trim().toUpperCase())
          .filter(Boolean);
      }
    } catch {}
  }

  return s
    .split(',')
    .map((x) => String(x).trim().toUpperCase())
    .filter(Boolean);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const symbol = String(searchParams.get('symbol') || '').trim().toUpperCase();
  const symbolsRaw = String(searchParams.get('symbols') || '').trim();

  // -------------------------
  // BULK MODE:
  // /api/price?symbols=BTCUSDT,ETHUSDT,...
  // -------------------------
  if (!symbol && symbolsRaw) {
    const symbols = parseSymbolsParam(symbolsRaw);

    if (!symbols.length) {
      return NextResponse.json({ ok: false, error: 'Missing symbols' }, { status: 400 });
    }

    // Binance bulk endpoint
    const url = `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(
      JSON.stringify(symbols)
    )}`;

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

      const arr: any[] = await r.json();
      const prices: Record<string, number> = {};

      for (const it of arr) {
        const sym = String(it?.symbol || '').toUpperCase();
        const p = num(it?.price);
        if (sym && p != null) prices[sym] = p;
      }

      return NextResponse.json({ ok: true, prices });
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, error: 'Fetch failed', detail: String(e?.message || e) },
        { status: 502 }
      );
    }
  }

  // -------------------------
  // SINGLE MODE:
  // /api/price?symbol=BTCUSDT
  // -------------------------
  if (!symbol) {
    return NextResponse.json({ ok: false, error: 'Missing symbol' }, { status: 400 });
  }

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
      price: lastPrice,
      changePct,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'Fetch failed', detail: String(e?.message || e) },
      { status: 502 }
    );
  }
}