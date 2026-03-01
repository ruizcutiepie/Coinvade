import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/admin/kyc  -> list users + kycStatus
export async function GET() {
  try {
    const session = await getServerSession(authOptions as any);
    const role = (session as any)?.user?.role;

    if (!session || role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        email: true,
        kycStatus: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, users });
  } catch (e: any) {
    console.error("[api/admin/kyc][GET]", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

// PUT /api/admin/kyc  body: { id, kycStatus }
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions as any);
    const role = (session as any)?.user?.role;

    if (!session || role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as any));
    const id = String(body?.id || "").trim();
    const kycStatus = String(body?.kycStatus || "").toUpperCase().trim();

    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }

    // must match your Prisma enum: UNVERIFIED | PENDING | VERIFIED | REJECTED
    if (!["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"].includes(kycStatus)) {
      return NextResponse.json({ ok: false, error: "Invalid kycStatus" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { kycStatus: kycStatus as any },
      select: { id: true, email: true, kycStatus: true, createdAt: true },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (e: any) {
    console.error("[api/admin/kyc][PUT]", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}