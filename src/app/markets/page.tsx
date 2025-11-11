import type { Metadata } from 'next';
import MarketsClient from './MarketsClient';

export const metadata: Metadata = {
  title: 'Markets | Coinvade',
  description: 'Live market tickers (demo) with price and sparkline.',
};

export default function MarketsPage() {
  return <MarketsClient />;
}
