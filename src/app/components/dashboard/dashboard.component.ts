import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MainLayoutComponent } from '../layout/main-layout.component';
import { User } from '../../models/auth.model';
import { DashboardService } from '../../services/dashboard.service';
import { DashboardStats } from '../../models/dashboard.model';
import { LanguageService } from '@app/services/extras/language.service';
import type { DashboardKpi, StackedBarPoint, StackedBarSegment, DonutSlice, DashboardTableRow } from '@app/models/dashboard.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MainLayoutComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  user: User | null = null;
  stats: DashboardStats | null = null;
  kpis: DashboardKpi[] = [];
  stackedBarData: StackedBarPoint[] = [];
  stackedBarLegend: { color: string; key: string }[] = [];
  tasksByDay: { day: string; count: number }[] = [];
  maxTasksCount = 1;
  donutData: DonutSlice[] = [];
  donutConicGradient = '';
  tableRows: DashboardTableRow[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private dashboardService: DashboardService,
    private languageService: LanguageService,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadStats();
    this.loadCharts();
  }

  async loadStats(): Promise<void> {
    try {
      const response = await this.dashboardService.getStats();
      if (response?.result?.success && response.data) {
        this.stats = response.data;
      }
    } catch (error) {
      console.error('Error loading dashboard stats', error);
    }
    this.kpis = this.dashboardService.buildKpis(this.stats);
  }

  async loadCharts(): Promise<void> {
    try {
      this.stackedBarData = await this.dashboardService.getStackedBarData();
      if (this.stackedBarData.length > 0 && this.stackedBarData[0].segments.length > 0) {
        this.stackedBarLegend = this.stackedBarData[0].segments.map((s: StackedBarSegment) => ({ color: s.color, key: s.key }));
      }
      this.tasksByDay = await this.dashboardService.getTasksByDay();
      this.maxTasksCount = Math.max(...this.tasksByDay.map((d) => d.count), 1);
      this.donutData = await this.dashboardService.getDonutData();
      this.donutConicGradient = this.buildDonutGradient(this.donutData);
      this.tableRows = await this.dashboardService.getTopArticlesTable();
    } catch (error) {
      console.error('Error loading dashboard charts', error);
    }
  }

  private buildDonutGradient(slices: DonutSlice[]): string {
    const total = slices.reduce((sum, s) => sum + s.value, 0);
    if (total === 0) return 'conic-gradient(var(--muted) 0deg 360deg)';
    let acc = 0;
    const parts = slices.map((s) => {
      const pct = (s.value / total) * 100;
      const start = acc;
      acc += pct;
      return `${s.color} ${start}% ${acc}%`;
    });
    return `conic-gradient(${parts.join(', ')})`;
  }

  t(key: string): string {
    return this.languageService.t(key);
  }
}
