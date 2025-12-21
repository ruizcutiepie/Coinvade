import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COINS = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'BNB', 'DOGE', 'DOT'] as const;
type Coin = (typeof COINS)[number];

const COINGECKO_IDS: Record<Coin, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  XRP: 'ripple',
  ADA: 'cardano',
  BNB: 'binancecoin',
  DOGE: 'dogecoin',
  DOT: 'polkadot',
};

async function fetchFromCoinGecko() {
  const ids = Object.values(COINGECKO_IDS).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
    ids
  )}&vs_currencies=usd`;

  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'coinvade/1.0',
    },
  });

  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);

  const json = (await res.json()) as Record<string, { usd?: number }>;

  const prices: Record<string, number> = { USDT: 1 };

  for (const c of COINS) {
    const id = COINGECKO_IDS[c];
    const usd = json?.[id]?.usd;
    if (typeof usd === 'number' && Number.isFinite(usd)) prices[c] = usd;
  }

  // ensure we have most
  const okCount = COINS.filter((c) => typeof prices[c] === 'number' && prices[c] > 0).length;
  if (okCount < 4) throw new Error('CoinGecko partial data');

  return prices;
}

async function fetchFromBinance() {
  const symbols = COINS.map((c) => `${c}USDT`);
  const url =
    'https://api.binance.com/api/v3/ticker/price?symbols=' +
    encodeURIComponent(JSON.stringify(symbols));

  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'coinvade/1.0',
    },
  });

  if (!res.ok) throw new Error(`Binance ${res.status}`);

  const arr: Array<{ symbol: string; price: string }> = await res.json();
  const prices: Record<string, number> = { USDT: 1 };

  for (const row of arr) {
    const coin = row.symbol.replace('USDT', '');
    const p = Number(row.price);
    if (Number.isFinite(p) && p > 0) prices[coin] = p;
  }

  const okCount = COINS.filter((c) => typeof prices[c] === 'number' && prices[c] > 0).length;
  if (okCount < 4) throw new Error('Binance partial data');

  return prices;
}

export async function GET() {
  try {
    // 1) Try CoinGecko (most reliable in serverless)
    const prices = await fetchFromCoinGecko();
    return NextResponse.json({ ok: true, source: 'coingecko', prices });
  } catch {
    try {
      // 2) Fallback to Binance
      const prices = await fetchFromBinance();
      return NextResponse.json({ ok: true, source: 'binance', prices });
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, error: true, message: e?.message || 'Price fetch failed' },
        { status: 502 }
      );
    }
  }
}
