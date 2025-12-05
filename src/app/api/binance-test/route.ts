// src/app/api/binance-test/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// ---- Binance config (from .env.local) ----
const API_KEY = process.env.BINANCE_API_KEY!;
const API_SECRET = process.env.BINANCE_API_SECRET!;
const BASE_URL = 'https://api.binance.com';

// Sign a query string using HMAC-SHA256
function sign(query: string): string {
  return crypto.createHmac('sha256', API_SECRET).update(query).digest('hex');
}

// ----- PUBLIC PRICE: /api/v3/ticker/price -----
async function getPrice(symbol: string): Promise<string> {
  const url = `${BASE_URL}/api/v3/ticker/price?symbol=${symbol}`;
  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch price: ${text}`);
  }

  const data = (await res.json()) as { price: string };
  return data.price;
}

// ----- PRIVATE ACCOUNT BALANCE: /api/v3/account -----
async function getAssetFreeBalance(asset: string): Promise<string> {
  const timestamp = Date.now();
  const query = `timestamp=${timestamp}`;
  const signature = sign(query);

  const url = `${BASE_URL}/api/v3/account?${query}&signature=${signature}`;

  const res = await fetch(url, {
    headers: {
      'X-MBX-APIKEY': API_KEY,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch account: ${text}`);
  }

  const data = (await res.json()) as {
    balances: { asset: string; free: string; locked: string }[];
  };

  const entry = data.balances.find((b) => b.asset === asset);
  return entry?.free ?? '0';
}

// ----- API Route Handler -----
export async function GET() {
  try {
    const symbol = 'BTCUSDT'; // you can change this
    const asset = 'USDT';     // and this

    const price = await getPrice(symbol);
    const usdtFree = await getAssetFreeBalance(asset);

    return NextResponse.json(
      {
        ok: true,
        symbol,
        price,
        usdtFree,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('[binance-test] DB error:', err);

    const message =
      err instanceof Error ? err.message : JSON.stringify(err);

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
