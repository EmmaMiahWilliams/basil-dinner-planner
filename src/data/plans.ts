// Basil Plus pricing. Demo only: nothing here talks to a payment provider.
// The reasoning and sources behind these numbers are in docs/pricing.md.

export type PlanId = 'monthly' | 'annual';

export const TRIAL_DAYS = 7;
/** Introductory monthly price, for the first INTRO_MONTHS months. */
export const INTRO_PRICE = 2.99;
export const INTRO_MONTHS = 3;
/** Target monthly price after the intro period. */
export const MONTHLY_PRICE = 7.99;
export const ANNUAL_PRICE = 49.99;

export const usd = (n: number) => `$${n.toFixed(2)}`;

export const PLANS: { id: PlanId; label: string; price: string; sub: string; badge?: string }[] = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: `${usd(INTRO_PRICE)}/month`,
    sub: `for your first ${INTRO_MONTHS} months, then ${usd(MONTHLY_PRICE)}/month`,
    badge: 'Intro offer',
  },
  {
    id: 'annual',
    label: 'Yearly',
    price: `${usd(ANNUAL_PRICE)}/year`,
    sub: `about ${usd(ANNUAL_PRICE / 12)}/month, billed once a year`,
    badge: `Save ${Math.round((1 - ANNUAL_PRICE / (MONTHLY_PRICE * 12)) * 100)}%`,
  },
];

export const FREE_FEATURES = ['Saturday check-in and a 5-dinner plan', 'Step-by-step cook mode', 'Plan-to-Plate score'];
export const PLUS_FEATURES = [
  'Grocery cart sent to the store for you',
  'Plans that learn from your glucose 👍/👎',
  'Smart swaps on low-energy nights',
  'Weekly progress and milestones history',
];

export type Subscription = {
  plan: PlanId;
  startedAt: string;
  /** End of the free trial. Nothing is charged before this, and in the demo nothing is charged at all. */
  trialEndsAt: string;
  cancelled: boolean;
};

export function startTrial(plan: PlanId, now = new Date()): Subscription {
  const end = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  return { plan, startedAt: now.toISOString(), trialEndsAt: end.toISOString(), cancelled: false };
}

/** What the first real charge would be, in plain words. */
export function firstCharge(plan: PlanId): string {
  return plan === 'monthly' ? `${usd(INTRO_PRICE)} a month for ${INTRO_MONTHS} months, then ${usd(MONTHLY_PRICE)} a month` : `${usd(ANNUAL_PRICE)} for the year`;
}
