import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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

  constructor(private dashboardService: DashboardService, private languageService: LanguageService) {}

  get maxValue(): number {
    return Math.max(...this.data.flatMap(d => [d.inbound, d.outbound]), 1);
  }

  async ngOnInit() {
    try {
      const response = await this.dashboardService.getStats();
      const stats = response?.result?.success ? response.data : null;
      this.data = this.dashboardService.getMovementChartData(stats);
    } catch {
      this.data = this.dashboardService.getMovementChartData(null);
    }
  }

  t(key: string): string { return this.languageService.t(key); }
}


