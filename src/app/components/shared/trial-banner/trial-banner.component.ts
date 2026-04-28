import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TrialService, TrialStatus } from '@app/services/trial.service';
import { LanguageService } from '@app/services/extras/language.service';

@Component({
  selector: 'app-trial-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="visible"
      [ngClass]="bannerClasses"
      role="alert"
      aria-live="polite">

      <div class="flex items-center gap-3 min-w-0 flex-1">
        <!-- Icon -->
        <svg *ngIf="!isPastDue" class="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <svg *ngIf="isPastDue" class="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        </svg>

        <!-- Message -->
        <span class="text-sm font-medium">{{ bannerMessage }}</span>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2 shrink-0">
        <button
          type="button"
          (click)="navigateToBilling()"
          class="inline-flex items-center rounded-md px-3 py-1 text-xs font-semibold bg-white/20 hover:bg-white/30 transition-colors border border-white/30">
          {{ t('trial_banner.upgrade_cta') }}
        </button>

        <!-- Dismiss (only for non-past_due) -->
        <button *ngIf="!isPastDue"
          type="button"
          (click)="dismiss()"
          aria-label="Cerrar banner"
          class="inline-flex items-center justify-center size-6 rounded hover:bg-white/20 transition-colors">
          <svg class="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .banner-pulse {
      animation: pulse-bg 1.5s ease-in-out infinite;
    }

    @keyframes pulse-bg {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.85; }
    }
  `],
})
export class TrialBannerComponent implements OnInit {
  status: TrialStatus | null = null;
  dismissed = false;

  private readonly DISMISS_KEY = 'trial_banner_dismissed_day';

  constructor(
    private trialService: TrialService,
    private languageService: LanguageService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    try {
      this.status = await this.trialService.getCurrentTrialStatus();
      // Check dismiss state
      if (!this.isPastDue) {
        const dismissedDay = localStorage.getItem(this.DISMISS_KEY);
        const today = new Date().toISOString().slice(0, 10);
        if (dismissedDay === today) {
          this.dismissed = true;
        }
      }
    } catch {
      // Silent — don't block the UI if billing API is unreachable
    }
  }

  get isPastDue(): boolean {
    return this.status?.status === 'past_due';
  }

  get visible(): boolean {
    if (!this.status) return false;
    if (this.status.status === 'active') return false;
    if (this.status.status === 'cancelled' || this.status.status === 'suspended') return false;

    // Trial: hide if dismissed today (unless past_due — always shown)
    if (this.status.status === 'trial') {
      if (this.dismissed) return false;
      // Don't show banner if trial_ends_at is in the past AND status is still 'trial'
      // (backend should have flipped to past_due, but guard anyway)
      if (this.status.trial_ends_at) {
        const end = new Date(this.status.trial_ends_at);
        if (end < new Date() && !this.isPastDue) return false;
      }
    }

    return true;
  }

  /**
   * B4 fix S3.6: derive remaining days defensively. Never trust the server's
   * `days_left` blindly — when `trial_ends_at` is present we recompute it on
   * the client because we observed a tenant whose server payload reported
   * days_left=0 even though trial_ends_at was 14 days in the future. Ceil
   * upwards so a trial that ends "tomorrow at 02:00" still shows >=1.
   */
  private get effectiveDaysLeft(): number {
    if (!this.status) return 0;
    if (this.status.trial_ends_at) {
      const end = new Date(this.status.trial_ends_at);
      if (!isNaN(end.getTime())) {
        const diffMs = end.getTime() - Date.now();
        return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      }
    }
    return this.status.days_left ?? 0;
  }

  get bannerClasses(): string[] {
    const base = [
      'flex', 'flex-col', 'sm:flex-row', 'sm:items-center', 'justify-between', 'gap-2', 'sm:gap-3',
      'px-3', 'sm:px-4', 'py-2.5', 'text-white', 'shadow-sm',
    ];

    if (this.isPastDue) {
      return [...base, 'bg-red-600'];
    }

    const days = this.effectiveDaysLeft;

    if (days < 0) {
      // Trial ended but server hasn't flipped status yet.
      return [...base, 'bg-red-600'];
    }
    if (days === 0) {
      // Today — pulsing
      return [...base, 'bg-red-600', 'banner-pulse'];
    } else if (days <= 2) {
      return [...base, 'bg-orange-500'];
    } else if (days <= 7) {
      return [...base, 'bg-amber-500'];
    } else {
      return [...base, 'bg-emerald-600'];
    }
  }

  get bannerMessage(): string {
    if (this.isPastDue) {
      return this.t('trial_banner.past_due_message');
    }

    const days = this.effectiveDaysLeft;

    if (days < 0) {
      return this.t('trial_banner.expired');
    }
    if (days === 0) {
      return this.t('trial_banner.expires_today');
    }
    if (days <= 2) {
      return this.t('trial_banner.expires_in_days_critical').replace('{n}', String(days));
    }
    if (days <= 7) {
      return this.t('trial_banner.expires_in_days_warning').replace('{n}', String(days));
    }
    return this.t('trial_banner.expires_in_days_safe').replace('{n}', String(days));
  }

  navigateToBilling(): void {
    this.router.navigate(['/settings/billing']);
  }

  dismiss(): void {
    if (this.isPastDue) return; // Cannot dismiss past_due
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(this.DISMISS_KEY, today);
    this.dismissed = true;
  }

  t(key: string): string {
    return this.languageService.t(key);
  }
}
