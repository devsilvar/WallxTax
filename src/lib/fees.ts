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
  dvaInflow: {
    pct: number;
    cap: number;
    borneBy: 'merchant';
    note: string;
  };
  withdrawal: {
    bearer: 'merchant' | 'platform';
    bands: Array<{ upTo: number | null; fee: number }>;
    stampDuty: { amount: number; from: number };
    note: string;
  };
}

export interface WithdrawalFeeEstimate {
  /** What the SME typed in. */
  requested: number;
  /** Transfer fee (+ stamp duty) Paystack will keep. */
  fee: number;
  /** What lands in the SME's bank account. */
  netAmount: number;
  /** What leaves the platform-held balance — requested in merchant mode, requested + fee in platform mode. */
  debitAmount: number;
  bearer: 'merchant' | 'platform';
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Banded flat transfer fee + stamp duty, read from the published schedule. */
function withdrawalCost(schedule: PaystackFeeSchedule, amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const { bands, stampDuty } = schedule.withdrawal;
  const band = bands.find((b) => b.upTo === null || amount <= b.upTo) ?? bands[bands.length - 1];
  let fee = band ? band.fee : 0;
  if (stampDuty && stampDuty.amount > 0 && amount >= stampDuty.from) fee += stampDuty.amount;
  return fee;
}

/**
 * Preview a withdrawal's fee breakdown the same way the backend's
 * `quoteWithdrawal` prices it. Returns null when the amount cannot be priced
 * (e.g. the fee would swallow the whole request in merchant mode) — the caller
 * should hide the preview and let the server return its authoritative error.
 */
export function estimateWithdrawal(
  schedule: PaystackFeeSchedule,
  requestedNaira: number
): WithdrawalFeeEstimate | null {
  const requested = round2(Number(requestedNaira) || 0);
  if (requested <= 0) return null;
  const bearer = schedule.withdrawal.bearer;

  if (bearer === 'platform') {
    const fee = withdrawalCost(schedule, requested);
    return {
      requested,
      fee,
      netAmount: requested,
      debitAmount: round2(requested + fee),
      bearer,
    };
  }

  // Merchant mode: the fee comes out of the request, so solve for the net whose
  // fee-inclusive cost equals what the SME asked for. The fee is banded, so
  // iterate until it settles — converges in ≤3 steps (four possible fee values).
  let fee = withdrawalCost(schedule, requested);
  let net = round2(requested - fee);
  for (let i = 0; i < 8; i += 1) {
    const nextFee = withdrawalCost(schedule, net);
    if (nextFee === fee) break;
    fee = nextFee;
    net = round2(requested - fee);
  }

  if (fee <= 0 || fee >= requested || round2(net + fee) !== requested) return null;
  return { requested, fee, netAmount: net, debitAmount: requested, bearer };
}
