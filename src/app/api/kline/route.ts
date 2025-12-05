// src/app/api/kline/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Kline = {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const symbol = (searchParams.get('symbol') || 'BTCUSDT').toUpperCase();
  const interval = searchParams.get('interval') || '1m';

  // NEW: Binance US endpoint (rarely blocked)
  const url = `https://api.binance.us/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=120`;

  try {
    const res = await fetch(url, {
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Binance US error:', res.status, text);
      return NextResponse.json(
        {
          error: true,
          source: 'binance-us',
          status: res.status,
          detail: text,
        },
        { status: 500 }
      );
    }

    const raw = await res.json();

    const klines: Kline[] = raw.map((k: any[]) => ({
      openTime: k[0],
      open: Number(k[1]),
      high: Number(k[2]),
      low: Number(k[3]),
      close: Number(k[4]),
      volume: Number(k[5]),
      closeTime: k[6],
    }));

    return NextResponse.json({ symbol, interval, klines });
  } catch (err: any) {
    console.error('Kline fetch failed:', err);
    return NextResponse.json(
      {
        error: true,
        source: 'server',
        message: 'Failed to fetch klines',
        detail: String(err),
      },
      { status: 500 }
    );
  }
}
