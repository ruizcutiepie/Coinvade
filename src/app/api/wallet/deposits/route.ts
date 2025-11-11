// src/app/api/wallet/deposits/route.ts
import { NextResponse } from 'next/server';

// Reuse the same in-memory store we used in /api/wallet
// If your /api/wallet defines these in that file, you can
// move them into a shared module. For now, we duplicate minimally.

type Deposit = {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  txId?: string;
};

type Store = {
  balance: number;
  deposits: Deposit[];
};

// NOTE: this is in-memory; restarts will reset.
const globalAny = global as any;
if (!globalAny.__WALLET_STORE__) {
  globalAny.__WALLET_STORE__ = {
    balance: 1000,
    deposits: [],
  } as Store;
}
const store: Store = globalAny.__WALLET_STORE__;

export async function POST(req: Request) {
  try {
    const { amount, txId } = await req.json();

    if (!amount || typeof amount !== 'number') {
      return NextResponse.json({ error: 'amount required (number)' }, { status: 400 });
    }

    const dep: Deposit = {
      id: crypto.randomUUID(),
      amount,
      status: 'pending',
      createdAt: Date.now(),
      txId,
    };
    store.deposits.unshift(dep);

    return NextResponse.json({ ok: true, deposit: dep });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'failed to create deposit' }, { status: 500 });
  }
}
