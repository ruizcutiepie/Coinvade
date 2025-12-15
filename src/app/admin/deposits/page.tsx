'use client';

import { useEffect, useState } from 'react';

type Deposit = {
  id: string;
  coin: string;
  network: string;
  amount: number | null;
  status: string;
  createdAt: string;
  user?: { email: string | null };
};

export default function AdminDeposits() {
  const [rows, setRows] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/deposits', { cache: 'no-store' });
    const j = await res.json();
    if (j.ok) setRows(j.deposits);
    setLoading(false);
  }

  async function act(id: string, action: 'APPROVE' | 'REJECT') {
    await fetch(`/api/admin/deposits/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="p-6 text-white">
      <h1 className="text-2xl font-semibold mb-4">Admin · Deposits</h1>

      {loading && <div className="text-sm opacity-60">Loading…</div>}

      <table className="w-full text-sm border border-white/10">
        <thead className="bg-white/5">
          <tr>
            <th className="p-2 text-left">User</th>
            <th className="p-2">Coin</th>
            <th className="p-2">Network</th>
            <th className="p-2">Amount</th>
            <th className="p-2">Status</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.id} className="border-t border-white/10">
              <td className="p-2">{d.user?.email ?? '—'}</td>
              <td className="p-2">{d.coin}</td>
              <td className="p-2">{d.network}</td>
              <td className="p-2">{d.amount ?? '—'}</td>
              <td className="p-2">{d.status}</td>
              <td className="p-2 space-x-2">
                {d.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => act(d.id, 'APPROVE')}
                      className="px-2 py-1 bg-emerald-500 text-black rounded"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => act(d.id, 'REJECT')}
                      className="px-2 py-1 bg-rose-500 text-black rounded"
                    >
                      Reject
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
