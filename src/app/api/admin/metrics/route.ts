import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions as any);
  const role = (session as any)?.user?.role;

  if (!session || role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // TOTAL USERS
  const totalUsers = await prisma.user.count();

  // TOTAL TRADES
  const totalTrades = await prisma.trade.count();

  // TOTAL USDT IN WALLETS (sum wallets where coin = "USDT")
  const usdtAgg = await prisma.wallet.aggregate({
    where: { coin: "USDT" },
    _sum: { balance: true },
  });
  const totalUsdtInWallets = Number(usdtAgg._sum.balance ?? 0);

  // Pending queues
  const pendingWithdrawals = await prisma.withdrawRequest.count({
    where: { status: "PENDING" },
  });

  const pendingDeposits = await prisma.depositIntent.count({
    where: { status: "PENDING" },
  });

  // Recent lists
  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, email: true, role: true, createdAt: true },
  });

  const recentTrades = await prisma.trade.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, pair: true, direction: true, amount: true, createdAt: true },
  });

  return NextResponse.json({
    ok: true,
    metrics: {
      totalUsers,
      totalUsdtInWallets,
      totalTrades,
      pendingWithdrawals,
      pendingDeposits,
      recentUsers,
      recentTrades,
    },
  });
}
