// src/app/admin/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import AdminDashboard from "./AdminDashboard";

// ✅ ensures this page is always server-checked (no static caching)
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions as any);
  const role = (session as any)?.user?.role;

  // ✅ Not logged in → go to login
  if (!session) {
    redirect("/login");
  }

  // ✅ Logged in but not admin → go to trade (or homepage)
  if (role !== "ADMIN") {
    redirect("/trade");
  }

  return <AdminDashboard />;
}
