import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import {
  Subscription,
  CheckoutSessionResponse,
  PortalSessionResponse,
  BillingPlan,
  FEATURE_PLAN_MATRIX,
  isPlanAtLeast,
} from '@app/models/billing.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/billing';
export const BILLING_URL = returnCompleteURI({
  URI: environment.API.BASE,
  API_Gateway: GATEWAY,
});

@Injectable({
  providedIn: 'root',
})
export class BillingService {
  /** Cached subscription (updated after fetch). Used by isFeatureAvailable(). */
  private _subscription: Subscription | null = null;

  constructor(private fetchService: FetchService) {}

  /**
   * @description Get current subscription details.
   * @returns Promise<ApiResponse<Subscription>>
   */
  async getSubscription(): Promise<ApiResponse<Subscription>> {
    const res = await this.fetchService.get<ApiResponse<Subscription>>({
      API_Gateway: `${BILLING_URL}/subscription`,
    });
    if (res?.result?.success && res.data) {
      this._subscription = res.data;
    }
    return res;
  }

  /**
   * @description Create a Stripe Checkout Session for a plan upgrade.
   * @param plan Target billing plan
   * @returns Promise<ApiResponse<CheckoutSessionResponse>>
   */
  async createCheckoutSession(plan: BillingPlan): Promise<ApiResponse<CheckoutSessionResponse>> {
    return this.fetchService.post<ApiResponse<CheckoutSessionResponse>>({
      API_Gateway: `${BILLING_URL}/checkout`,
      values: { plan },
    });
  }

  /**
   * @description Create a Stripe Customer Portal session (manage invoices, payment, cancel).
   * @returns Promise<ApiResponse<PortalSessionResponse>>
   */
  async createPortalSession(): Promise<ApiResponse<PortalSessionResponse>> {
    return this.fetchService.post<ApiResponse<PortalSessionResponse>>({
      API_Gateway: `${BILLING_URL}/portal-session`,
      values: {},
    });
  }

  /**
   * @description Check whether a feature is available under the current plan.
   * Uses the last fetched subscription. Returns true if plan is sufficient.
   * @param feature Feature key (e.g. 'api_access', 'export_excel')
   * @returns boolean
   */
  isFeatureAvailable(feature: string): boolean {
    if (!this._subscription) return false;
    const required = FEATURE_PLAN_MATRIX[feature];
    if (!required) return true; // Feature not gated
    return isPlanAtLeast(this._subscription.plan, required);
  }

  /** Returns the currently cached subscription (may be null if not yet fetched). */
  getCachedSubscription(): Subscription | null {
    return this._subscription;
  }
}
