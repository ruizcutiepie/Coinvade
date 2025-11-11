'use client';

import { useEffect, useState } from 'react';

export default function AdminPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function fetchWallet() {
    const res = await fetch('/api/wallet');
    const data = await res.json();
    setWallet(data);
  }

  async function updateDeposit(id: string, action: 'approve' | 'reject') {
    setLoading(true);
    await fetch('/api/wallet', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    await fetchWallet();
    setLoading(false);
  }

  useEffect(() => {
    fetchWallet();
  }, []);

  return (
    <main className="mx-auto max-w-5xl p-8 text-white space-y-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="mb-4 text-lg font-semibold">Pending Deposits</h2>

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-white/70">
              <th>ID</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {wallet?.deposits?.length ? (
              wallet.deposits.map((d: any) => (
                <tr key={d.id} className="border-t border-white/10">
                  <td className="py-2">{d.id.slice(0, 6)}…</td>
                  <td className="py-2">${d.amount}</td>
                  <td className="py-2">
                    {d.status === 'pending' && <span className="text-amber-300">Pending</span>}
                    {d.status === 'approved' && <span className="text-teal-300">Approved</span>}
                    {d.status === 'rejected' && <span className="text-rose-300">Rejected</span>}
                  </td>
                  <td className="py-2">{new Date(d.createdAt).toLocaleString()}</td>
                  <td className="py-2">
                    {d.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          disabled={loading}
                          onClick={() => updateDeposit(d.id, 'approve')}
                          className="px-3 py-1 rounded bg-teal-600 hover:bg-teal-500 text-sm"
                        >
                          Approve
                        </button>
                        <button
                          disabled={loading}
                          onClick={() => updateDeposit(d.id, 'reject')}
                          className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-white/40 italic">—</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-4 text-white/50">
                  No deposits found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-lg mb-2 font-semibold">Current Balance</h2>
        <div className="text-2xl font-semibold">
          {wallet ? `${wallet.balance.toLocaleString()} USDT` : '...'}
        </div>
      </section>
    </main>
  );
}
