import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DashboardStats } from '@app/models/dashboard.model';
import { LanguageService } from '@app/services/extras/language.service';

@Component({
  selector: 'app-dashboard-kpi-cards',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <ng-container *ngIf="stats; else skeleton">
        <div class="bg-white rounded-lg border border-border shadow-sm p-5" *ngFor="let kpi of kpis">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <span class="h-6 w-6 inline-block text-primary" [innerHTML]="sanitize(kpi.icon)"></span>
            </div>
            <div class="ml-5 w-0 flex-1">
              <dl>
                <dt class="text-sm font-medium text-primary truncate">{{ kpi.title }}</dt>
                <dd class="text-lg font-medium text-[var(--foreground)]">{{ kpi.value }}</dd>
              </dl>
            </div>
          </div>
        </div>
      </ng-container>
      <ng-template #skeleton>
        <div class="bg-white rounded-lg border border-border shadow-sm p-5 animate-pulse" *ngFor="let _ of [0,1,2,3]">
          <div class="h-16 bg-gray-200 rounded"></div>
        </div>
      </ng-template>
    </div>
  `,
})
export class KpiCardsComponent {
  @Input() stats: DashboardStats | null = null;

  symbol = '₡';

  constructor(private languageService: LanguageService, private sanitizer: DomSanitizer) {}

  get kpis() {
    if (!this.stats) return [];
    return [
      {
        title: this.t('total_skus'),
        value: this.stats.totalSkus.toLocaleString(),
        icon: this.packageSvg,
      },
      {
        title: this.t('inventory_value'),
        value: `${this.symbol}${this.stats.inventoryValue.toLocaleString()}`,
        icon: this.trendingUpSvg,
      },
      {
        title: this.t('low_stock_count'),
        value: this.stats.lowStockCount.toLocaleString(),
        icon: this.alertTriangleSvg,
      },
      {
        title: this.t('active_tasks'),
        value: this.stats.activeTasks.toLocaleString(),
        icon: this.checkCircleSvg,
      },
    ];
  }

  t(key: string): string {
    return this.languageService.t(key);
  }

  // Template helper to sanitize SVGs before binding with [innerHTML]
  sanitize(svg: string): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(svg); }

  private get packageSvg() { return `
    <svg width='24' height='24' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'></path>
    </svg>`; }

  private get trendingUpSvg() { return `
    <svg width='24' height='24' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M3 3v18h18'></path>
      <path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M7 13l4-4 3 3 6-6'></path>
    </svg>`; }

  private get alertTriangleSvg() { return `
    <svg width='24' height='24' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z'></path>
    </svg>`; }

  private get checkCircleSvg() { return `
    <svg width='24' height='24' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M9 12l2 2 4-4'></path>
      <circle cx='12' cy='12' r='9' stroke-width='2' stroke='currentColor' fill='none'></circle>
    </svg>`; }
}


