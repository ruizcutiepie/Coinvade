import { NextResponse } from "next/server";
import { getWallet, addDeposit, approveDeposit, rejectDeposit } from "@/app/lib/walletStore";

export async function GET() {
  // get wallet info
  return NextResponse.json(getWallet());
}

export async function POST(req: Request) {
  const { amount } = await req.json();
  const dep = addDeposit(amount);
  return NextResponse.json(dep);
}

export async function PUT(req: Request) {
  const { id, action } = await req.json();
  if (action === "approve") {
    const dep = approveDeposit(id);
    return NextResponse.json(dep ?? { error: "not found" });
  } else if (action === "reject") {
    const dep = rejectDeposit(id);
    return NextResponse.json(dep ?? { error: "not found" });
  }
  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}
