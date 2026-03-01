// src/lib/payout.ts

// ✅ Single source of truth for payout math (must match UI durations)

export type TradeDirection = "LONG" | "SHORT";

export const DURATION_PROFIT_RATE: Record<number, number> = {
  30: 0.15,
  45: 0.2,
  60: 0.35,
  90: 0.65,
  120: 0.9,
  180: 0.92,
  240: 0.93,
  300: 0.95,
};

/** Returns profit rate (e.g., 0.65 for 65%) or 0 if unsupported */
export function getProfitRate(durationSec: number): number {
  return DURATION_PROFIT_RATE[Number(durationSec)] ?? 0;
}

/** Estimated payout shown to user: stake * (1 + rate) */
export function getEstimatedPayout(stake: number, durationSec: number): number {
  const s = Number(stake);
  if (!Number.isFinite(s) || s <= 0) return 0;
  const r = getProfitRate(durationSec);
  return s * (1 + r);
}

/**
 * Settlement delta to wallet (profit/loss only):
 * - WIN: + stake * rate
 * - LOSS: - stake
 * - TIE: 0
 */
export function getSettlementDelta(
  stake: number,
  durationSec: number,
  won: boolean | null
): number {
  const s = Number(stake);
  if (!Number.isFinite(s) || s <= 0) return 0;

  const r = getProfitRate(durationSec);

  if (won === true) return s * r;
  if (won === false) return -s;
  return 0;
}

/**
 * Full payout amount stored on trade record:
 * - WIN: stake * (1 + rate)
 * - LOSS: 0
 * - TIE: stake (or 0 depending on your rules — this returns stake)
 */
export function getTradePayout(
  stake: number,
  durationSec: number,
  won: boolean | null
): number {
  const s = Number(stake);
  if (!Number.isFinite(s) || s <= 0) return 0;

  const r = getProfitRate(durationSec);

  if (won === true) return s * (1 + r);
  if (won === false) return 0;

  // tie/open rules:
  // If you prefer tie payout = 0, change this to `return 0;`
  return s;
}

/** Safety: validate duration exists in table */
export function isSupportedDuration(durationSec: number): boolean {
  return DURATION_PROFIT_RATE[Number(durationSec)] != null;
}