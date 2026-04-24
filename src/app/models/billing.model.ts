export type BillingPlan = 'trial' | 'starter' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'unpaid' | 'incomplete';

export interface Subscription {
  plan: BillingPlan;
  status: SubscriptionStatus;
  trial_ends_at?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
}

export interface CheckoutSessionRequest {
  plan: BillingPlan;
}

export interface CheckoutSessionResponse {
  url: string;
}

export interface PortalSessionResponse {
  url: string;
}

/** Feature-to-plan matrix: which plan is required to access each feature. */
export const FEATURE_PLAN_MATRIX: Record<string, BillingPlan> = {
  'export_excel': 'starter',
  'api_access': 'pro',
  'unlimited_warehouses': 'pro',
  'priority_support': 'pro',
  'custom_integrations': 'enterprise',
  'dedicated_support': 'enterprise',
  'sla': 'enterprise',
};

/** Ordered plan hierarchy for comparison. */
export const PLAN_ORDER: BillingPlan[] = ['trial', 'starter', 'pro', 'enterprise'];

export function isPlanAtLeast(current: BillingPlan, required: BillingPlan): boolean {
  return PLAN_ORDER.indexOf(current) >= PLAN_ORDER.indexOf(required);
}
