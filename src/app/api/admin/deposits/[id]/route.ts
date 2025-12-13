// src/app/api/admin/deposits/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// (Optional) ensures this runs in Node.js runtime (recommended for NextAuth + Prisma)
export const runtime = "nodejs";

type Body = {
  action: "APPROVE" | "REJECT";
};

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ Admin check (server-side)
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    if (!session || role !== "ADMIN") {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const id = params.id;
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing deposit id" },
        { status: 400 }
      );
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    const action = body?.action;

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json(
        { ok: false, error: "Invalid action" },
        { status: 400 }
      );
    }

    // ✅ Transaction: read deposit, validate, update status, and (if approve) credit wallet
    const result = await prisma.$transaction(async (tx) => {
      const dep = await tx.depositIntent.findUnique({
        where: { id },
      });

      if (!dep) {
        return { ok: false as const, status: 404 as const, error: "Deposit not found" };
      }

      // Prevent double-processing
      if (dep.status !== "PENDING") {
        return {
          ok: false as const,
          status: 409 as const,
          error: `Deposit already processed (status: ${dep.status})`,
        };
      }

      if (action === "REJECT") {
        const updated = await tx.depositIntent.update({
          where: { id },
          data: { status: "FAILED" }, // or "REJECTED" if you prefer
        });

        return { ok: true as const, deposit: updated };
      }

      // APPROVE:
      // Must have amount to credit
      const amt = dep.amount ?? null;
      if (amt == null || Number.isNaN(Number(amt)) || Number(amt) <= 0) {
        return {
          ok: false as const,
          status: 400 as const,
          error: "Deposit amount is missing/invalid. Set amount before approving.",
        };
      }

      // 1) Credit wallet (upsert so it works even if wallet doesn't exist yet)
      await tx.wallet.upsert({
        where: {
          userId_coin: { userId: dep.userId, coin: dep.coin },
        },
        create: {
          userId: dep.userId,
          coin: dep.coin,
          balance: Number(amt),
        },
        update: {
          balance: { increment: Number(amt) },
        },
      });

      // 2) Mark deposit confirmed
      const updated = await tx.depositIntent.update({
        where: { id },
        data: { status: "CONFIRMED" }, // any non-PENDING removes it from your pending list
      });

      return { ok: true as const, deposit: updated };
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({ ok: true, deposit: result.deposit });
  } catch (err: any) {
    console.error("[admin/deposits/:id] error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
