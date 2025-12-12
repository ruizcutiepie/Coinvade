// src/app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";

// ✅ Use whichever authOptions export you actually have:
import authOptions from "@/lib/auth";
// If your auth is a NAMED export instead, replace the line above with:
// import { authOptions } from "@/lib/auth";

function isAdmin(session: any) {
  return Boolean(session?.user && session.user.role === "ADMIN");
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions as any);
    if (!isAdmin(session)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        wallets: {
          select: { coin: true, balance: true },
        },
      },
    });

    // Optional: compute totals per user (ex: USDT)
    const mapped = users.map((u) => {
      const totals: Record<string, number> = {};
      for (const w of u.wallets) {
        totals[w.coin] = (totals[w.coin] ?? 0) + (w.balance ?? 0);
      }

      return {
        ...u,
        totals,
        usdt: totals["USDT"] ?? 0,
      };
    });

    return NextResponse.json({ ok: true, users: mapped });
  } catch (e) {
    console.error("[api/admin/users] GET error:", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions as any);
    if (!isAdmin(session)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const userId = body?.id as string | undefined;
    const role = body?.role as string | undefined;

    if (!userId || !role) {
      return NextResponse.json(
        { ok: false, error: "Missing id or role" },
        { status: 400 }
      );
    }

    if (role !== "USER" && role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, error: "Invalid role. Use USER or ADMIN." },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (e) {
    console.error("[api/admin/users] PUT error:", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
