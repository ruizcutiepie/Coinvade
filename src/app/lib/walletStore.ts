// src/app/lib/walletStore.ts
// Simple in-memory store (for demo)
export type Deposit = {
  id: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

let balance = 1000;
let deposits: Deposit[] = [];

export function getWallet() {
  return { balance, deposits };
}

export function addDeposit(amount: number) {
  const deposit: Deposit = {
    id: Math.random().toString(36).slice(2),
    amount,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  deposits.push(deposit);
  return deposit;
}

export function approveDeposit(id: string) {
  const dep = deposits.find((d) => d.id === id);
  if (dep && dep.status === "pending") {
    dep.status = "approved";
    balance += dep.amount;
  }
  return dep;
}

export function rejectDeposit(id: string) {
  const dep = deposits.find((d) => d.id === id);
  if (dep && dep.status === "pending") {
    dep.status = "rejected";
  }
  return dep;
}
