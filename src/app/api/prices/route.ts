// src/app/api/prices/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const COINS = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'BNB', 'DOGE', 'DOT'];

async function fetchPrice(symbol: string) {
  // Binance public endpoint (no key needed)
  const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Binance price failed for ${symbol}`);
  const j = await res.json();
  return Number(j?.price ?? 0) || 0;
}

export async function GET() {
  try {
    const entries = await Promise.all(
      COINS.map(async (c) => {
        const symbol = `${c}USDT`;
        const price = await fetchPrice(symbol);
        return [c, price] as const;
      })
    );

    const prices: Record<string, number> = Object.fromEntries(entries);
    prices.USDT = 1;
    prices.USDC = 1;

    return NextResponse.json({ ok: true, prices });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Failed to load prices' },
      { status: 500 }
    );
  }
}
