// src/app/admin/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import AdminDashboard from "./AdminDashboard";

export default async function AdminPage() {
  // Get the current logged-in session (server side)
  const session = await getServerSession(authOptions as any);
  const role = (session as any)?.user?.role;

  // If no session or not an admin → kick them out
  if (!session || role !== "ADMIN") {
    // you can change this to '/login' if you prefer
    redirect("/");
  }

  // Otherwise show the admin dashboard
  return <AdminDashboard />;
}
