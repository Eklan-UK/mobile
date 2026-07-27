import type { BillingPeriod } from '@/types/billing';

/**
 * Locked Android Stripe display prices (product rules).
 * Server maps `billingPeriod` → Stripe price IDs — never send price IDs from the client.
 */
export const STRIPE_PRICING: Record<
  BillingPeriod,
  { label: string; priceLabel: string; periodHint: string }
> = {
  monthly: {
    label: 'Monthly',
    priceLabel: 'US$20',
    periodHint: '/ month',
  },
  quarterly: {
    label: 'Quarterly',
    priceLabel: 'US$60',
    periodHint: '/ 3 months',
  },
  annual: {
    label: 'Annual',
    priceLabel: '$200',
    periodHint: '/ year',
  },
};

export const STRIPE_BILLING_PERIODS: BillingPeriod[] = [
  'monthly',
  'quarterly',
  'annual',
];

export function billingPeriodDisplayLabel(
  period: BillingPeriod | null | undefined
): string | null {
  if (!period || !(period in STRIPE_PRICING)) return null;
  return STRIPE_PRICING[period].label;
}
