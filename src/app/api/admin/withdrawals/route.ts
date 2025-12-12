// src/app/api/admin/withdrawals/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions as any);
  const user = (session as any)?.user;

  if (!user?.id) return null;
  if (user.role !== "ADMIN") return null;

  return { id: user.id as string, role: user.role as string };
}

// GET /api/admin/withdrawals
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const withdrawals = await prisma.withdrawRequest.findMany({
    include: { user: { select: { id: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return NextResponse.json({ ok: true, withdrawals });
}

// PUT /api/admin/withdrawals  { id, action: "approve"|"reject"|"paid" }
export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id, action } = await req.json();

  if (!id || !["approve", "reject", "paid"].includes(action)) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const current = await prisma.withdrawRequest.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!current) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  // Allowed transitions:
  // PENDING -> APPROVED | REJECTED
  // APPROVED -> PAID
  if (action === "approve" && current.status !== "PENDING") {
    return NextResponse.json({ ok: false, error: "Only PENDING can be approved" }, { status: 400 });
  }
  if (action === "reject" && current.status !== "PENDING") {
    return NextResponse.json({ ok: false, error: "Only PENDING can be rejected" }, { status: 400 });
  }
  if (action === "paid" && current.status !== "APPROVED") {
    return NextResponse.json({ ok: false, error: "Only APPROVED can be marked PAID" }, { status: 400 });
  }

  const nextStatus =
    action === "approve" ? "APPROVED" :
    action === "reject" ? "REJECTED" :
    "PAID";

  const updated = await prisma.withdrawRequest.update({
    where: { id },
    data: { status: nextStatus },
    include: { user: { select: { id: true, email: true } } },
  });

  return NextResponse.json({ ok: true, withdrawal: updated });
}
