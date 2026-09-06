/**
 * Client-side mirror of the backend Paystack fee model
 * (`backend/src/lib/paystack-fees.ts`).
 *
 * The backend is the source of truth — it prices the actual withdrawal and
 * stores fee/netAmount on the payout row. This module exists only so the UI can
 * PREVIEW the numbers before the SME confirms. The schedule it computes from
 * comes from `GET /settlement/preview` (the `fees` field), so no naira figure
 * is hardcoded here and a backend pricing change flows through without a
 * frontend deploy.
 */

export interface PaystackFeeSchedule {
  currency: string;
  minWithdrawal?: number;
  dvaInflow: {
    pct: number;
    cap: number;
    borneBy: 'merchant';
    note: string;
  };
  withdrawal: {
    bearer: 'merchant' | 'platform';
    ratePct?: number;
    cap?: number;
    minAmount?: number;
    bands: Array<{ upTo: number | null; fee: number }>;
    stampDuty: { amount: number; from: number };
    note: string;
  };
}

export interface WithdrawalFeeEstimate {
  /** What the SME typed in. */
  requested: number;
  /** WallX fee (1% capped at ₦300). */
  fee: number;
  /** What lands in the SME's bank account. */
  netAmount: number;
  /** What leaves the platform-held balance — requested in merchant mode, requested + fee in platform mode. */
  debitAmount: number;
  bearer: 'merchant' | 'platform';
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export const MIN_WITHDRAWAL_AMOUNT = 1000.00;
export const WALLX_WITHDRAWAL_PCT = 1.0;
export const WALLX_WITHDRAWAL_CAP = 300.00;

/**
 * Preview a withdrawal's fee breakdown matching the backend's
 * `quoteWithdrawal` (1% capped at ₦300, min ₦1,000).
 */
export function estimateWithdrawal(
  schedule: PaystackFeeSchedule | undefined | null,
  requestedNaira: number
): WithdrawalFeeEstimate | null {
  const requested = round2(Number(requestedNaira) || 0);
  const minFloor = schedule?.minWithdrawal ?? schedule?.withdrawal?.minAmount ?? MIN_WITHDRAWAL_AMOUNT;
  if (requested < minFloor) return null;

  const bearer = schedule?.withdrawal?.bearer ?? 'merchant';
  const ratePct = schedule?.withdrawal?.ratePct ?? WALLX_WITHDRAWAL_PCT;
  const cap = schedule?.withdrawal?.cap ?? WALLX_WITHDRAWAL_CAP;

  const fee = round2(Math.min((requested * ratePct) / 100, cap));

  if (bearer === 'platform') {
    return {
      requested,
      fee,
      netAmount: requested,
      debitAmount: round2(requested + fee),
      bearer,
    };
  }

  // Merchant mode: fee comes out of requested
  const net = round2(requested - fee);
  if (net <= 0) return null;

  return { requested, fee, netAmount: net, debitAmount: requested, bearer };
}
