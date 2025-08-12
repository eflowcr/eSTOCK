import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CardContainerComponent } from './card-container.component';
import { LanguageService } from '@app/services/extras/language.service';
import { DashboardService } from '@app/services/dashboard.service';
import { StockAlert } from '@app/models/dashboard.model';

@Component({
  selector: 'app-dashboard-stock-alerts',
  standalone: true,
  imports: [CommonModule, CardContainerComponent],
  template: `
    <app-dashboard-card [title]="t('stock_alerts')">
      <div class="flex flex-row items-center justify-between space-y-0 pb-2"></div>
      <div class="space-y-4">
        <div class="grid grid-cols-3 gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-red-600">{{ criticalAlerts.length }}</div>
            <div class="text-xs text-muted-foreground flex items-center justify-center">
              <span class="text-red-600" [innerHTML]="warningSvg"></span>
              <span class="ml-1 text-[var(--foreground)]">{{ t('critical') }}</span>
            </div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-orange-600">{{ highAlerts.length }}</div>
            <div class="text-xs text-muted-foreground flex items-center justify-center">
              <span class="text-orange-600" [innerHTML]="trendingDownSvg"></span>
              <span class="ml-1 text-[var(--foreground)]">{{ t('high') }}</span>
            </div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-yellow-600">{{ mediumAlerts.length }}</div>
            <div class="text-xs text-muted-foreground flex items-center justify-center">
              <span class="text-yellow-600" [innerHTML]="clockSvg"></span>
              <span class="ml-1 text-[var(--foreground)]">{{ t('medium') }}</span>
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-medium text-muted-foreground">{{ t('recent_alerts') }}</h4>
          <div *ngIf="alerts.length === 0" class="text-center py-4 text-sm text-muted-foreground">{{ t('no_active_alerts') }}</div>
          <div *ngIf="alerts.length > 0" class="space-y-2">
            <div *ngFor="let alert of alerts | slice:0:3" class="flex items-center justify-between p-2 rounded-lg border">
              <div class="flex items-center space-x-2">
                <span class="text-primary" [innerHTML]="getAlertIcon(alert.alertLevel)"></span>
                <div>
                  <div class="text-sm font-medium text-[var(--foreground)]">{{ alert.sku }}</div>
                  <div class="text-xs text-muted-foreground text-primary">{{ alert.currentStock }} {{ t('units_remaining') }}</div>
                </div>
              </div>
              <span class="text-xs px-2 py-1 rounded border" [ngClass]="getBadgeClass(alert.alertLevel)">{{ t(alert.alertLevel) }}</span>
            </div>
          </div>
        </div>

        <button *ngIf="alerts.length > 0" class="w-full text-sm bg-primary text-white rounded px-3 py-2" disabled>
          {{ t('manage_all_alerts') }} ({{ alerts.length }})
        </button>
      </div>
    </app-dashboard-card>
  `,
})
export class StockAlertsWidgetComponent implements OnInit {
  alerts: StockAlert[] = [];

  constructor(private dashboardService: DashboardService, private languageService: LanguageService, private sanitizer: DomSanitizer) {}

  get criticalAlerts() { return this.alerts.filter(a => a.alertLevel === 'critical'); }
  get highAlerts() { return this.alerts.filter(a => a.alertLevel === 'high'); }
  get mediumAlerts() { return this.alerts.filter(a => a.alertLevel === 'medium'); }

  async ngOnInit() {
    this.alerts = await this.dashboardService.getStockAlerts();
  }

  getAlertIcon(level: StockAlert['alertLevel']): SafeHtml {
    switch (level) {
      case 'critical': return this.warningSvg;
      case 'high': return this.trendingDownSvg;
      case 'medium': return this.clockSvg;
      default: return this.barMiniSvg;
    }
  }

  getBadgeClass(level: StockAlert['alertLevel']): string {
    switch (level) {
      case 'critical': return 'text-red-600 border-red-600';
      case 'high': return 'text-orange-600 border-orange-600';
      case 'medium': return 'text-yellow-600 border-yellow-600';
      default: return 'text-blue-600 border-blue-600';
    }
  }

  get warningSvg(): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(`
    <svg class='h-4 w-4' fill='none' viewBox='0 0 24 24'>
      <defs>
        <linearGradient id='gradWarn' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='#ef4444'/>
          <stop offset='100%' stop-color='#f97316'/>
        </linearGradient>
      </defs>
      <path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' stroke='url(#gradWarn)'
        d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z'></path>
    </svg>`); }

  get trendingDownSvg(): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(`
    <svg class='h-4 w-4' fill='none' viewBox='0 0 24 24'>
      <defs>
        <linearGradient id='gradHigh' x1='0' y1='1' x2='1' y2='0'>
          <stop offset='0%' stop-color='#f97316'/>
          <stop offset='100%' stop-color='#fb923c'/>
        </linearGradient>
      </defs>
      <path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' stroke='url(#gradHigh)'
        d='M21 15l-7-7-4 4-6-6'></path>
    </svg>`); }

  get clockSvg(): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(`
    <svg class='h-4 w-4' fill='none' viewBox='0 0 24 24'>
      <defs>
        <linearGradient id='gradMed' x1='0' y1='1' x2='1' y2='0'>
          <stop offset='0%' stop-color='#eab308'/>
          <stop offset='100%' stop-color='#fde047'/>
        </linearGradient>
      </defs>
      <circle cx='12' cy='12' r='9' stroke-width='2' stroke='url(#gradMed)' fill='none'></circle>
      <path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' stroke='url(#gradMed)'
        d='M12 7v5l3 3'></path>
    </svg>`); }

  get barMiniSvg(): SafeHtml { return this.sanitizer.bypassSecurityTrustHtml(`
    <svg class='h-4 w-4' fill='none' viewBox='0 0 24 24'>
      <defs>
        <linearGradient id='gradBars' x1='0' y1='1' x2='1' y2='0'>
          <stop offset='0%' stop-color='#3e66ea'/>
          <stop offset='100%' stop-color='#7ea7ff'/>
        </linearGradient>
      </defs>
      <path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' stroke='url(#gradBars)' d='M3 3v18h18'></path>
      <rect x='6' y='10' width='2' height='7' fill='url(#gradBars)' stroke='none' rx='0.5'></rect>
      <rect x='11' y='7' width='2' height='10' fill='url(#gradBars)' stroke='none' rx='0.5'></rect>
      <rect x='16' y='12' width='2' height='5' fill='url(#gradBars)' stroke='none' rx='0.5'></rect>
    </svg>`); }

  t(key: string): string { return this.languageService.t(key); }
}


