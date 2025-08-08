import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CardContainerComponent } from './card-container.component';
import { LanguageService } from '@app/services/extras/language.service';
import { DashboardService } from '@app/services/dashboard.service';

@Component({
  selector: 'app-dashboard-movement-chart',
  standalone: true,
  imports: [CommonModule, CardContainerComponent],
  template: `
    <app-dashboard-card [title]="t('daily_movement')">
      <div class="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
        <div class="text-center">
          <div class="mx-auto h-12 w-12 text-primary" [innerHTML]="barChartSvg"></div>
          <p class="mt-2 text-sm text-gray-500">{{ t('inbound_vs_outbound_chart') }}</p>
          <p class="text-xs text-gray-400 mt-1">{{ t('chart_implementation_placeholder') }}</p>
        </div>
      </div>
    </app-dashboard-card>
  `,
})
export class MovementChartComponent implements OnInit {
  data: { date: string; inbound: number; outbound: number }[] = [];

  constructor(private dashboardService: DashboardService, private languageService: LanguageService, private sanitizer: DomSanitizer) {}

  async ngOnInit() {
    this.data = await this.dashboardService.getMovementChartData();
  }

  get barChartSvg(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(`
      <svg width='48' height='48' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
        <path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M3 3v18h18'></path>
        <rect x='6' y='10' width='2.5' height='7' fill='currentColor' stroke='none'></rect>
        <rect x='11' y='7' width='2.5' height='10' fill='currentColor' stroke='none'></rect>
        <rect x='16' y='12' width='2.5' height='5' fill='currentColor' stroke='none'></rect>
      </svg>`);
  }

  t(key: string): string { return this.languageService.t(key); }
}


