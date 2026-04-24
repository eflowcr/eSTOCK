import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LanguageService } from '@app/services/extras/language.service';
import { BillingService } from '@app/services/billing.service';
import { BillingPlan } from '@app/models/billing.model';

@Component({
  selector: 'app-plan-locked-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      (click)="onBackdropClick($event)">
      <div class="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5">

        <!-- Icon -->
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
            <svg class="h-6 w-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <div>
            <h3 class="text-base font-semibold text-foreground">{{ t('billing.locked_title') }}</h3>
            <p class="text-xs text-muted-foreground mt-0.5">{{ feature }}</p>
          </div>
        </div>

        <!-- Body -->
        <p class="text-sm text-muted-foreground leading-relaxed">
          {{ buildMessage() }}
        </p>

        <!-- Required plan badge -->
        <div class="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <svg class="h-4 w-4 shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
          </svg>
          <span class="text-xs font-medium text-foreground">
            {{ t('billing.required_plan') }}:
            <span class="font-semibold text-primary ml-1">{{ t('billing.plan_' + requiredPlan) }}</span>
          </span>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-3 pt-1">
          <button type="button" (click)="cancel()"
            class="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent active:scale-[0.97]">
            {{ t('cancel') }}
          </button>
          <button type="button" (click)="upgradeNow()"
            class="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.97]">
            <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
            </svg>
            {{ t('billing.upgrade_now') }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class PlanLockedModalComponent {
  @Input() isOpen = false;
  @Input() feature = '';
  @Input() requiredPlan: BillingPlan = 'starter';

  @Output() closed = new EventEmitter<void>();

  constructor(
    private languageService: LanguageService,
    private billingService: BillingService,
    private router: Router,
  ) {}

  t(key: string): string {
    return this.languageService.t(key);
  }

  buildMessage(): string {
    const currentPlan = this.billingService.getCachedSubscription()?.plan ?? 'trial';
    const template = this.t('billing.locked_body');
    return template
      .replace('{feature}', this.feature)
      .replace('{requiredPlan}', this.t(`billing.plan_${this.requiredPlan}`))
      .replace('{currentPlan}', this.t(`billing.plan_${currentPlan}`));
  }

  upgradeNow(): void {
    this.isOpen = false;
    this.closed.emit();
    this.router.navigate(['/settings/billing']);
  }

  cancel(): void {
    this.isOpen = false;
    this.closed.emit();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.cancel();
    }
  }
}
