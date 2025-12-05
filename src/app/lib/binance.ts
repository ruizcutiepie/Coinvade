// src/app/lib/binance.ts

const BASE_URL = 'https://api.binance.com';

// Simple demo fallback prices in case Binance is down / blocked
const DEMO_PRICES: Record<string, number> = {
  BTCUSDT: 91000,
  ETHUSDT: 3400,
  SOLUSDT: 190,
  XRPUSDT: 0.60,
  ADAUSDT: 0.55,
};

export async function getPrice(symbol: string): Promise<number> {
  const upperSymbol = symbol.toUpperCase();

  try {
    const url = `${BASE_URL}/api/v3/ticker/price?symbol=${upperSymbol}`;

    const res = await fetch(url, {
      // these hints help Next not cache this
      cache: 'no-store',
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      throw new Error(`Binance HTTP ${res.status}`);
    }

    const data = (await res.json()) as { price?: string };
    const price = Number(data.price);

    if (!Number.isFinite(price)) {
      throw new Error('Binance returned invalid price');
    }

    return price;
  } catch (err) {
    console.error(
      '[binance] getPrice failed, falling back to demo price for',
      upperSymbol,
      err,
    );

    // Fallback: use a demo price so the trade still resolves
    const fallback =
      DEMO_PRICES[upperSymbol] ??
      90000 + Math.random() * 2000 * (upperSymbol.startsWith('BTC') ? 1 : 0.1);

    return fallback;
  }
}
