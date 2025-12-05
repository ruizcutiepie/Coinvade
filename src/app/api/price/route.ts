// src/app/api/price/route.ts
import { NextResponse } from 'next/server';

type CacheEntry = { price: number; percent: number; ts: number };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 15_000; // 15s - smooths over transient outages

function symbolToCoingeckoId(symbol: string): string | null {
  // map the symbols you support
  const map: Record<string, string> = {
    BTCUSDT: 'bitcoin',
    ETHUSDT: 'ethereum',
    SOLUSDT: 'solana',
    XRPUSDT: 'ripple',
    ADAUSDT: 'cardano',
    BNBUSDT: 'binancecoin',
    DOGEUSDT: 'dogecoin',
    DOTUSDT: 'polkadot',
  };
  return map[symbol.toUpperCase()] ?? null;
}

async function fetchUpstream(id: string) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`;
  const res = await fetch(url, { cache: 'no-store', next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const data = (await res.json()) as any;
  const entry = data[id];
  if (!entry) throw new Error('Unexpected payload');
  const price = Number(entry.usd);
  const percent = Number(entry.usd_24h_change);
  if (!isFinite(price) || !isFinite(percent)) throw new Error('Bad numbers');
  return { price, percent };
}

// Simple retry with backoff
async function fetchWithRetry(id: string, attempts = 3) {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetchUpstream(id);
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 250 * 2 ** i)); // 250ms, 500ms, 1s
    }
  }
  throw lastErr;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol')?.toUpperCase() || 'BTCUSDT';
  const id = symbolToCoingeckoId(symbol);
  if (!id) {
    return NextResponse.json({ error: 'Unsupported symbol' }, { status: 400 });
  }

  // Serve fresh if we can, else use cache fallback
  const now = Date.now();
  const hit = cache.get(symbol);
  try {
    const { price, percent } = await fetchWithRetry(id);
    cache.set(symbol, { price, percent, ts: now });
    const res = NextResponse.json({ price, percent });
    res.headers.set('Cache-Control', 'private, max-age=5'); // browser can reuse for 5s
    return res;
  } catch (e) {
    if (hit && now - hit.ts < TTL_MS) {
      // Serve last good value
      const res = NextResponse.json(
        { price: hit.price, percent: hit.percent, stale: true },
        { status: 200 }
      );
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }
    return NextResponse.json(
      { error: 'Upstream unavailable' },
      { status: 502 }
    );
  }
}
