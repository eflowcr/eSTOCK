import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { TenantStatus } from '@app/models/tenant.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

export interface TrialStatus {
  status: TenantStatus;
  trial_ends_at: string | null;
  days_left: number;
}

const BILLING_URL = returnCompleteURI({
  URI: environment.API.BASE,
  API_Gateway: '/billing',
});

@Injectable({ providedIn: 'root' })
export class TrialService {
  constructor(private fetchService: FetchService) {}

  /**
   * Fetches the current tenant subscription status from the billing API.
   * Returns a resolved TrialStatus with days_left computed from trial_ends_at.
   */
  async getCurrentTrialStatus(): Promise<TrialStatus> {
    const res = await this.fetchService.get<ApiResponse<TrialStatus>>({
      API_Gateway: `${BILLING_URL}/subscription`,
    });

    const data = res.data;
    const daysLeft = this.computeDaysLeft(data?.trial_ends_at ?? null);

    return {
      status: data?.status ?? 'trial',
      trial_ends_at: data?.trial_ends_at ?? null,
      days_left: daysLeft,
    };
  }

  private computeDaysLeft(trialEndsAt: string | null): number {
    if (!trialEndsAt) return 0;
    const now = new Date();
    const end = new Date(trialEndsAt);
    const diffMs = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }
}
