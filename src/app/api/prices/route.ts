import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COINS = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'BNB', 'DOGE', 'DOT'] as const;

type Coin = (typeof COINS)[number];

export async function GET() {
  try {
    // Build Binance symbols list
    const symbols = COINS.map((c) => `${c}USDT`);
    const url =
      'https://api.binance.com/api/v3/ticker/price?symbols=' +
      encodeURIComponent(JSON.stringify(symbols));

    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'coinvade/1.0',
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: true, message: `Binance error ${res.status}` },
        { status: 502 }
      );
    }

    const arr: Array<{ symbol: string; price: string }> = await res.json();

    const prices: Record<string, number> = { USDT: 1 };

    for (const row of arr) {
      // row.symbol is like "BTCUSDT"
      const sym = row.symbol.replace('USDT', '') as Coin;
      const p = Number(row.price);
      if (Number.isFinite(p)) prices[sym] = p;
    }

    return NextResponse.json({ ok: true, prices }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: true, message: e?.message || 'Price fetch failed' },
      { status: 500 }
    );
  }
}
