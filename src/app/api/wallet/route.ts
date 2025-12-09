// src/app/api/wallet/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

type DepositDto = {
  id: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

async function getCurrentUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user || !(session.user as any).id) {
    return null;
  }

  return {
    id: (session.user as any).id as string,
    role: ((session.user as any).role as string) ?? "USER",
  };
}

// GET: current user's wallet + deposits
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let wallet = await prisma.wallet.findFirst({
    where: { userId: user.id, coin: "USDT" },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        userId: user.id,
        coin: "USDT",
        balance: 0,
      },
    });
  }

  const deposits = await prisma.depositIntent.findMany({
    where: { userId: user.id, coin: "USDT" },
    orderBy: { createdAt: "desc" },
  });

  const depositsDto: DepositDto[] = deposits.map((d) => ({
    id: d.id,
    amount: d.amount ?? 0,
    status:
      d.status === "PENDING"
        ? "pending"
        : d.status === "CONFIRMED"
        ? "approved"
        : "rejected",
    createdAt: d.createdAt.toISOString(),
  }));

  return NextResponse.json({
    balance: wallet.balance,
    deposits: depositsDto,
  });
}

// POST: create deposit intent
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { amount } = await req.json();
  if (typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const dep = await prisma.depositIntent.create({
    data: {
      userId: user.id,
      coin: "USDT",
      network: "Demo network",
      amount,
      status: "PENDING",
    },
  });

  const dto: DepositDto = {
    id: dep.id,
    amount: dep.amount ?? 0,
    status: "pending",
    createdAt: dep.createdAt.toISOString(),
  };

  return NextResponse.json(dto);
}

// PUT: admin approve / reject deposit
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, action } = await req.json();

  if (!id || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  const dep = await prisma.depositIntent.findUnique({
    where: { id },
  });

  if (!dep) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (dep.status !== "PENDING") {
    return NextResponse.json(
      { error: "already processed" },
      { status: 400 },
    );
  }

  if (action === "approve") {
    const updatedDep = await prisma.depositIntent.update({
      where: { id },
      data: { status: "CONFIRMED" },
    });

    let wallet = await prisma.wallet.findFirst({
      where: { userId: dep.userId, coin: dep.coin },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId: dep.userId,
          coin: dep.coin,
          balance: 0,
        },
      });
    }

    await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: (wallet.balance ?? 0) + (dep.amount ?? 0),
      },
    });

    const dto: DepositDto = {
      id: updatedDep.id,
      amount: updatedDep.amount ?? 0,
      status: "approved",
      createdAt: updatedDep.createdAt.toISOString(),
    };
    return NextResponse.json(dto);
  }

  const rejectedDep = await prisma.depositIntent.update({
    where: { id },
    data: { status: "FAILED" },
  });

  const dto: DepositDto = {
    id: rejectedDep.id,
    amount: rejectedDep.amount ?? 0,
    status: "rejected",
    createdAt: rejectedDep.createdAt.toISOString(),
  };

  return NextResponse.json(dto);
}
