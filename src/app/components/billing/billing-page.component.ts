import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MainLayoutComponent } from '@app/components/layout/main-layout.component';
import { LanguageService } from '@app/services/extras/language.service';
import { AlertService } from '@app/services/extras/alert.service';
import { BillingService } from '@app/services/billing.service';
import { Subscription, BillingPlan, PLAN_ORDER } from '@app/models/billing.model';
import { handleApiError } from '@app/utils';

interface PlanFeature {
  labelKey: string;
  trial: boolean | string;
  starter: boolean | string;
  pro: boolean | string;
  enterprise: boolean | string;
}

interface PlanMeta {
  id: BillingPlan;
  nameKey: string;
  priceKey: string;
  accentClass: string;
  badgeClass: string;
}

const PLANS: PlanMeta[] = [
  {
    id: 'trial',
    nameKey: 'billing.plan_trial',
    priceKey: 'billing.plan_trial_price',
    accentClass: 'border-muted-foreground/30',
    badgeClass: 'bg-muted text-muted-foreground',
  },
  {
    id: 'starter',
    nameKey: 'billing.plan_starter',
    priceKey: 'billing.plan_starter_price',
    accentClass: 'border-blue-500',
    badgeClass: 'bg-blue-500/10 text-blue-600',
  },
  {
    id: 'pro',
    nameKey: 'billing.plan_pro',
    priceKey: 'billing.plan_pro_price',
    accentClass: 'border-primary',
    badgeClass: 'bg-primary/10 text-primary',
  },
  {
    id: 'enterprise',
    nameKey: 'billing.plan_enterprise',
    priceKey: 'billing.plan_enterprise_price',
    accentClass: 'border-amber-500',
    badgeClass: 'bg-amber-500/10 text-amber-600',
  },
];

const PLAN_FEATURES: PlanFeature[] = [
  {
    labelKey: 'billing.feature_warehouses',
    trial: 'billing.feature_limited',
    starter: '1',
    pro: 'billing.feature_unlimited',
    enterprise: 'billing.feature_unlimited',
  },
  {
    labelKey: 'billing.feature_users',
    trial: 'billing.feature_limited',
    starter: '5',
    pro: 'billing.feature_unlimited',
    enterprise: 'billing.feature_unlimited',
  },
  {
    labelKey: 'billing.feature_articles',
    trial: 'billing.feature_limited',
    starter: '500',
    pro: 'billing.feature_unlimited',
    enterprise: 'billing.feature_unlimited',
  },
  {
    labelKey: 'billing.feature_api_access',
    trial: false,
    starter: false,
    pro: true,
    enterprise: true,
  },
  {
    labelKey: 'billing.feature_export',
    trial: false,
    starter: true,
    pro: true,
    enterprise: true,
  },
  {
    labelKey: 'billing.feature_support',
    trial: 'billing.feature_support_basic',
    starter: 'billing.feature_support_basic',
    pro: 'billing.feature_support_priority',
    enterprise: 'billing.feature_support_dedicated',
  },
  {
    labelKey: 'billing.feature_sla',
    trial: false,
    starter: false,
    pro: false,
    enterprise: true,
  },
  {
    labelKey: 'billing.feature_custom_integrations',
    trial: false,
    starter: false,
    pro: false,
    enterprise: true,
  },
];

@Component({
  selector: 'app-billing-page',
  standalone: true,
  imports: [CommonModule, RouterModule, MainLayoutComponent],
  template: `
    <app-main-layout>
      <div class="mx-auto max-w-5xl space-y-8">

        <!-- Page header -->
        <div>
          <h1 class="text-2xl font-semibold text-foreground">{{ t('billing.title') }}</h1>
          <p class="mt-0.5 text-sm text-muted-foreground">{{ t('billing.subtitle') }}</p>
        </div>

        <!-- Loading skeleton -->
        <div *ngIf="loading()" class="space-y-4">
          <div class="h-32 rounded-xl bg-muted animate-pulse"></div>
          <div class="h-64 rounded-xl bg-muted animate-pulse"></div>
        </div>

        <!-- Checkout success/cancel banner -->
        <div *ngIf="checkoutResult() === 'success'"
          class="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-emerald-800 dark:bg-emerald-950/30">
          <svg class="h-5 w-5 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-sm font-medium text-emerald-700 dark:text-emerald-400">{{ t('billing.checkout_success') }}</p>
        </div>
        <div *ngIf="checkoutResult() === 'cancelled'"
          class="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-800 dark:bg-amber-950/30">
          <svg class="h-5 w-5 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-sm font-medium text-amber-700 dark:text-amber-400">{{ t('billing.checkout_cancelled') }}</p>
        </div>

        <ng-container *ngIf="!loading()">

          <!-- Current plan card -->
          <div class="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div class="space-y-1">
                <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">{{ t('billing.current_plan') }}</p>
                <div class="flex items-center gap-3">
                  <h2 class="text-xl font-bold text-foreground">{{ planDisplayName(subscription()?.plan ?? 'trial') }}</h2>
                  <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    [ngClass]="statusBadgeClass(subscription()?.status)">
                    {{ t('billing.status_' + (subscription()?.status ?? 'unknown')) }}
                  </span>
                </div>

                <!-- Trial countdown -->
                <p *ngIf="subscription()?.trial_ends_at && subscription()?.plan === 'trial'"
                  class="text-sm text-amber-600 dark:text-amber-400">
                  {{ t('billing.trial_ends') }}: {{ formatDate(subscription()!.trial_ends_at!) }}
                  <span class="ml-1 font-semibold">({{ daysLeft(subscription()!.trial_ends_at!) }})</span>
                </p>

                <!-- Current period end -->
                <p *ngIf="subscription()?.current_period_end && subscription()?.plan !== 'trial'"
                  class="text-sm text-muted-foreground">
                  {{ subscription()?.cancel_at_period_end ? t('billing.cancels_on') : t('billing.renews_on') }}:
                  {{ formatDate(subscription()!.current_period_end!) }}
                </p>

                <!-- Cancel at period end warning -->
                <div *ngIf="subscription()?.cancel_at_period_end"
                  class="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
                  <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                  {{ t('billing.cancel_at_period_end_warning') }}
                </div>
              </div>

              <!-- Stripe Portal button -->
              <button type="button"
                (click)="openPortal()"
                [disabled]="portalLoading()"
                class="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed">
                <svg *ngIf="portalLoading()" class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <svg *ngIf="!portalLoading()" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                </svg>
                {{ t('billing.manage_billing') }}
              </button>
            </div>
          </div>

          <!-- Plans comparison table -->
          <div>
            <h3 class="mb-4 text-base font-semibold text-foreground">{{ t('billing.plans_title') }}</h3>

            <!-- Mobile: stacked plan cards -->
            <div class="grid gap-4 sm:hidden">
              <div *ngFor="let plan of plans" class="rounded-xl border-2 bg-card p-5 space-y-4"
                [ngClass]="[plan.accentClass, subscription()?.plan === plan.id ? 'ring-2 ring-primary ring-offset-2' : '']">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-semibold text-foreground">{{ t(plan.nameKey) }}</p>
                    <p class="text-sm text-muted-foreground">{{ t(plan.priceKey) }}</p>
                  </div>
                  <span *ngIf="subscription()?.plan === plan.id"
                    class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {{ t('billing.current') }}
                  </span>
                </div>
                <ng-container [ngTemplateOutlet]="planActionBtn" [ngTemplateOutletContext]="{ plan }"></ng-container>
              </div>
            </div>

            <!-- Desktop: full comparison table -->
            <div class="hidden sm:block overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
              <table class="w-full min-w-[600px] text-sm">
                <thead>
                  <tr class="border-b border-border bg-muted/40">
                    <th class="px-5 py-4 text-left text-xs font-semibold text-muted-foreground w-48">{{ t('billing.feature') }}</th>
                    <th *ngFor="let plan of plans" class="px-4 py-4 text-center"
                      [ngClass]="subscription()?.plan === plan.id ? 'bg-primary/5' : ''">
                      <div class="space-y-1">
                        <p class="text-sm font-semibold text-foreground">{{ t(plan.nameKey) }}</p>
                        <p class="text-xs text-muted-foreground">{{ t(plan.priceKey) }}</p>
                        <span *ngIf="subscription()?.plan === plan.id"
                          class="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          {{ t('billing.current') }}
                        </span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border">
                  <tr *ngFor="let feature of features" class="hover:bg-accent/40 transition-colors">
                    <td class="px-5 py-3 font-medium text-foreground">{{ t(feature.labelKey) }}</td>
                    <td *ngFor="let plan of plans" class="px-4 py-3 text-center"
                      [ngClass]="subscription()?.plan === plan.id ? 'bg-primary/5' : ''">
                      <ng-container [ngTemplateOutlet]="featureCell"
                        [ngTemplateOutletContext]="{ value: featureValue(feature, plan.id) }">
                      </ng-container>
                    </td>
                  </tr>
                  <!-- Action row -->
                  <tr class="bg-muted/20">
                    <td class="px-5 py-4"></td>
                    <td *ngFor="let plan of plans" class="px-4 py-4 text-center"
                      [ngClass]="subscription()?.plan === plan.id ? 'bg-primary/5' : ''">
                      <ng-container [ngTemplateOutlet]="planActionBtn" [ngTemplateOutletContext]="{ plan }"></ng-container>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </ng-container>
      </div>

      <!-- Feature cell template -->
      <ng-template #featureCell let-value="value">
        <ng-container *ngIf="value === true">
          <svg class="mx-auto h-5 w-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
          </svg>
        </ng-container>
        <ng-container *ngIf="value === false">
          <svg class="mx-auto h-4 w-4 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </ng-container>
        <span *ngIf="value !== true && value !== false" class="text-xs text-muted-foreground">{{ value }}</span>
      </ng-template>

      <!-- Plan action button template -->
      <ng-template #planActionBtn let-plan="plan">
        <ng-container *ngIf="plan.id === 'enterprise'">
          <a href="mailto:sales@eprac.io"
            class="inline-flex w-full items-center justify-center rounded-md border border-amber-500 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-600 transition-colors hover:bg-amber-500/20 active:scale-[0.97]">
            {{ t('billing.contact_sales') }}
          </a>
        </ng-container>
        <ng-container *ngIf="plan.id !== 'enterprise'">
          <button type="button"
            (click)="selectPlan(plan.id)"
            [disabled]="subscription()?.plan === plan.id || checkoutLoading() === plan.id"
            class="inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
            [ngClass]="subscription()?.plan === plan.id
              ? 'bg-muted text-muted-foreground cursor-default'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'">
            <svg *ngIf="checkoutLoading() === plan.id" class="mr-1.5 h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {{ subscription()?.plan === plan.id ? t('billing.current') : t('billing.select_plan') }}
          </button>
        </ng-container>
      </ng-template>

      <!-- Confirm checkout dialog -->
      <div *ngIf="confirmPlan()" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        (click)="cancelConfirm($event)">
        <div class="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <svg class="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
              </svg>
            </div>
            <h3 class="text-base font-semibold text-foreground">{{ t('billing.confirm_checkout_title') }}</h3>
          </div>
          <p class="text-sm text-muted-foreground">
            {{ t('billing.confirm_checkout_body').replace('{plan}', planDisplayName(confirmPlan()!)) }}
          </p>
          <div class="flex items-center justify-end gap-3 pt-2">
            <button type="button" (click)="confirmPlan.set(null)"
              class="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent active:scale-[0.97]">
              {{ t('cancel') }}
            </button>
            <button type="button" (click)="confirmCheckout()"
              [disabled]="checkoutLoading() !== null"
              class="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed">
              <svg *ngIf="checkoutLoading() !== null" class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {{ t('billing.confirm_checkout_ok') }}
            </button>
          </div>
        </div>
      </div>

    </app-main-layout>
  `,
})
export class BillingPageComponent implements OnInit {
  loading = signal(true);
  subscription = signal<Subscription | null>(null);
  checkoutLoading = signal<BillingPlan | null>(null);
  portalLoading = signal(false);
  confirmPlan = signal<BillingPlan | null>(null);
  checkoutResult = signal<'success' | 'cancelled' | null>(null);

  readonly plans = PLANS;
  readonly features = PLAN_FEATURES;

  constructor(
    private billingService: BillingService,
    private alertService: AlertService,
    private languageService: LanguageService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Detect ?checkout=success or ?checkout=cancelled
    this.route.queryParams.subscribe(params => {
      const result = params['checkout'];
      if (result === 'success' || result === 'cancelled') {
        this.checkoutResult.set(result as 'success' | 'cancelled');
        // Clean up query param without navigation
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true,
        });
      }
    });

    this.loadSubscription();
  }

  private async loadSubscription(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.billingService.getSubscription();
      if (res?.result?.success) {
        this.subscription.set(res.data);
      }
    } catch (err: any) {
      this.alertService.error(
        handleApiError(err, this.t('billing.load_error')),
        this.t('error'),
      );
    } finally {
      this.loading.set(false);
    }
  }

  selectPlan(plan: BillingPlan): void {
    this.confirmPlan.set(plan);
  }

  cancelConfirm(event: Event): void {
    if (event.target === event.currentTarget) {
      this.confirmPlan.set(null);
    }
  }

  async confirmCheckout(): Promise<void> {
    const plan = this.confirmPlan();
    if (!plan) return;
    this.checkoutLoading.set(plan);
    try {
      const res = await this.billingService.createCheckoutSession(plan);
      if (res?.result?.success && res.data?.url) {
        this.confirmPlan.set(null);
        window.location.href = res.data.url;
      } else {
        this.alertService.error(this.t('billing.checkout_error'), this.t('error'));
      }
    } catch (err: any) {
      this.alertService.error(
        handleApiError(err, this.t('billing.checkout_error')),
        this.t('error'),
      );
    } finally {
      this.checkoutLoading.set(null);
    }
  }

  async openPortal(): Promise<void> {
    this.portalLoading.set(true);
    try {
      const res = await this.billingService.createPortalSession();
      if (res?.result?.success && res.data?.url) {
        window.location.href = res.data.url;
      } else {
        this.alertService.error(this.t('billing.portal_error'), this.t('error'));
      }
    } catch (err: any) {
      this.alertService.error(
        handleApiError(err, this.t('billing.portal_error')),
        this.t('error'),
      );
    } finally {
      this.portalLoading.set(false);
    }
  }

  t(key: string): string {
    return this.languageService.t(key);
  }

  planDisplayName(plan: BillingPlan): string {
    return this.t(`billing.plan_${plan}`);
  }

  featureValue(feature: PlanFeature, plan: BillingPlan): boolean | string {
    const raw = feature[plan] as boolean | string;
    if (typeof raw === 'string') {
      return this.t(raw);
    }
    return raw;
  }

  statusBadgeClass(status?: string): string {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-600';
      case 'trialing': return 'bg-blue-500/10 text-blue-600';
      case 'past_due': return 'bg-red-500/10 text-red-600';
      case 'cancelled': return 'bg-muted text-muted-foreground';
      case 'unpaid': return 'bg-red-500/10 text-red-600';
      default: return 'bg-muted text-muted-foreground';
    }
  }

  formatDate(isoDate: string): string {
    if (!isoDate) return '';
    return new Date(isoDate).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  daysLeft(isoDate: string): string {
    const diff = new Date(isoDate).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return this.t('billing.trial_expired');
    return days === 1
      ? `1 ${this.t('billing.day_left')}`
      : `${days} ${this.t('billing.days_left')}`;
  }
}
