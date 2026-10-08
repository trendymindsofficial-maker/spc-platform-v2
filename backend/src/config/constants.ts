/*
|--------------------------------------------------------------------------
| SBC BUSINESS RULES
|--------------------------------------------------------------------------
|
| These values were duplicated across the old Next.js route handlers.
| They are centralised here so membership pricing and referral maths can
| never drift between endpoints.
|
*/

/** SBC student membership price in rupees. Never trusted from the browser. */
export const MEMBERSHIP_AMOUNT = 199;

/** Membership duration identifier stored on the student document. */
export const MEMBERSHIP_PLAN = "1_year";

/** Razorpay works in paise. */
export const MEMBERSHIP_AMOUNT_PAISE = MEMBERSHIP_AMOUNT * 100;

/** Maximum redemptions per student per business, across all offers. */
export const MAX_REDEMPTIONS_PER_BUSINESS = 4;

/** A referral reward unlocks for every N successful referrals. */
export const REFERRAL_REWARD_STEP = 10;

/** Rupees earned each time the referral step is reached. */
export const REFERRAL_REWARD_AMOUNT = 250;

/** Smallest payout a student may request. */
export const MIN_PAYOUT_AMOUNT = 250;

/**
 * Total referral rupees earned for a given number of successful referrals.
 */
export function referralTotalEarned(successfulReferrals: number): number {
  const count = Math.max(0, Math.floor(Number(successfulReferrals) || 0));

  return Math.floor(count / REFERRAL_REWARD_STEP) * REFERRAL_REWARD_AMOUNT;
}
