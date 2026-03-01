import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/kyc/submit  (placeholder)
// Later you can accept uploads, docs, etc.
// For now: set current user's kycStatus to PENDING
export async function POST() {
  try {
    const session = await getServerSession(authOptions as any);
    const userId = (session as any)?.user?.id;

    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.update({
      where: { id: String(userId) },
      data: { kycStatus: "PENDING" as any },
      select: { id: true, email: true, kycStatus: true },
    });

    return NextResponse.json({ ok: true, user });
  } catch (e: any) {
    console.error("[api/kyc/submit][POST]", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}