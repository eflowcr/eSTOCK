import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { LanguageService } from '@app/services/extras/language.service';
import { DashboardService } from '@app/services/dashboard.service';
import { CardContainerComponent } from '../card-container/card-container.component';

@Component({
  selector: 'app-dashboard-movement-chart',
  standalone: true,
  imports: [CommonModule, CardContainerComponent],
  templateUrl: './movement-chart.component.html'
})
export class MovementChartComponent implements OnInit {
  data: { date: string; inbound: number; outbound: number }[] = [];

  constructor(private dashboardService: DashboardService, private languageService: LanguageService, private sanitizer: DomSanitizer) {}

  async ngOnInit() {
    this.data = await this.dashboardService.getMovementChartData();
  }

  get barChartSvg(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(`
      <svg width='48' height='48' fill='none' viewBox='0 0 24 24'>
        <defs>
          <linearGradient id='gradChartAxis' x1='0' y1='1' x2='1' y2='0'>
            <stop offset='0%' stop-color='#00113f'/>
            <stop offset='100%' stop-color='#3e66ea'/>
          </linearGradient>
          <linearGradient id='gradChartBars' x1='0' y1='1' x2='1' y2='0'>
            <stop offset='0%' stop-color='#3e66ea'/>
            <stop offset='100%' stop-color='#7ea7ff'/>
          </linearGradient>
        </defs>
        <path stroke-linecap='round' stroke-linejoin='round' stroke-width='2.2' stroke='url(#gradChartAxis)' d='M3 3v18h18'></path>
        <rect x='6' y='10' width='2.5' height='7' fill='url(#gradChartBars)' stroke='none' rx='0.5'></rect>
        <rect x='11' y='7' width='2.5' height='10' fill='url(#gradChartBars)' stroke='none' rx='0.5'></rect>
        <rect x='16' y='12' width='2.5' height='5' fill='url(#gradChartBars)' stroke='none' rx='0.5'></rect>
      </svg>`);
  }

  t(key: string): string { return this.languageService.t(key); }
}


