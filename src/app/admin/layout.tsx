// src/app/admin/layout.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = (await getServerSession(authOptions as any)) as any;
  const user = session?.user;

  // ❌ Not logged in
  if (!user) {
    redirect('/login');
  }

  // ❌ Logged in but not admin
  if (user.role !== 'ADMIN') {
    redirect('/trade');
  }

  // ✅ Admin access granted
  return (
    <section className="min-h-screen bg-black text-white">
      {children}
    </section>
  );
}

