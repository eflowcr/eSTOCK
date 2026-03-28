import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MainLayoutComponent } from '../layout/main-layout.component';
import { User } from '../../models/auth.model';
import { DashboardService } from '../../services/dashboard.service';
import { DashboardStats } from '../../models/dashboard.model';
import { LanguageService } from '@app/services/extras/language.service';
import { AlertService } from '@app/services/extras/alert.service';
import type { DashboardKpi, StackedBarPoint, StackedBarSegment, DonutSlice, DashboardTableRow } from '@app/models/dashboard.model';
import { ZardSelectComponent } from '../../shared/components/select/select.component';
import { ZardSelectItemComponent } from '../../shared/components/select/select-item.component';
import { ZardDialogService } from '@app/shared/components/dialog';
import { DashboardFiltersContentComponent } from './dashboard-filters-content/dashboard-filters-content.component';
import { DataExportContentComponent } from '../shared/data-export/data-export-content.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MainLayoutComponent, ZardSelectComponent, ZardSelectItemComponent],
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

  // Period selections — bound to the z-select widgets
  headerPeriod = 'monthly';
  tasksPeriod = 'weekly';
  distributionPeriod = 'monthly';

  // Active filters
  lowStockThreshold = 20;

  get dateRangeLabel(): string {
    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - 29);
    const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `${fmt(from)} – ${fmt(now)}`;
  }

  get tasksWeekTotal(): number {
    return this.tasksByDay.reduce((sum, d) => sum + d.count, 0);
  }

  get movementsTotal(): number {
    return this.stackedBarData.reduce((sum, p) => sum + p.total, 0);
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private dashboardService: DashboardService,
    private languageService: LanguageService,
    private alertService: AlertService,
    private dialogService: ZardDialogService,
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }
    const error = this.route.snapshot.queryParams['error'];
    if (error === 'access_denied') {
      this.alertService.error(
        this.t('user_management.insufficient_permissions') || 'Insufficient permissions',
        this.t('user_management.access_denied') || 'Access denied'
      );
      this.router.navigate([], { relativeTo: this.route, queryParams: {}, queryParamsHandling: '' });
    }
    this.loadStats();
    this.loadCharts();
  }

  async loadStats(): Promise<void> {
    try {
      const response = await this.dashboardService.getStats(this.tasksPeriod, this.lowStockThreshold);
      if (response?.result?.success && response.data) {
        this.stats = response.data;
      }
    } catch (error) {
      console.error('Error loading dashboard stats', error);
    }
    this.kpis = this.dashboardService.buildKpis(this.stats);
    this.tasksByDay = this.dashboardService.getTasksByDay(this.stats);
    this.maxTasksCount = Math.max(...this.tasksByDay.map((d) => d.count), 1);
  }

  async loadCharts(): Promise<void> {
    try {
      const [stackedBar, inventorySummary] = await Promise.all([
        this.dashboardService.getStackedBarData(this.headerPeriod),
        this.dashboardService.getInventorySummary(this.distributionPeriod),
      ]);
      this.stackedBarData = stackedBar;
      if (this.stackedBarData.length > 0 && this.stackedBarData[0].segments.length > 0) {
        this.stackedBarLegend = this.stackedBarData[0].segments.map((s: StackedBarSegment) => ({ color: s.color, key: s.key }));
      }
      this.donutData = inventorySummary.locationDistribution;
      this.donutConicGradient = this.buildDonutGradient(this.donutData);
      this.tableRows = inventorySummary.topArticles;
    } catch (error) {
      console.error('Error loading dashboard charts', error);
    }
  }

  async onHeaderPeriodChange(period: string | string[]): Promise<void> {
    this.headerPeriod = period as string;
    const stackedBar = await this.dashboardService.getStackedBarData(this.headerPeriod);
    this.stackedBarData = stackedBar;
    if (this.stackedBarData.length > 0 && this.stackedBarData[0].segments.length > 0) {
      this.stackedBarLegend = this.stackedBarData[0].segments.map((s: StackedBarSegment) => ({ color: s.color, key: s.key }));
    }
  }

  async onTasksPeriodChange(period: string | string[]): Promise<void> {
    this.tasksPeriod = period as string;
    await this.loadStats();
  }

  async onDistributionPeriodChange(period: string | string[]): Promise<void> {
    this.distributionPeriod = period as string;
    const inventorySummary = await this.dashboardService.getInventorySummary(this.distributionPeriod);
    this.donutData = inventorySummary.locationDistribution;
    this.donutConicGradient = this.buildDonutGradient(this.donutData);
    this.tableRows = inventorySummary.topArticles;
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

  openFilter(): void {
    this.dialogService.create({
      zTitle: this.t('dashboard.filter'),
      zContent: DashboardFiltersContentComponent,
      zHideFooter: true,
      zCustomClasses: 'sm:max-w-sm',
      zData: {
        lowStockThreshold: this.lowStockThreshold,
        onApply: ({ lowStockThreshold }: { lowStockThreshold: number }) => {
          this.lowStockThreshold = lowStockThreshold;
          this.loadStats();
        },
      },
    });
  }

  openExport(): void {
    const exportData = [
      // KPI section
      ...this.kpis.map(k => ({
        Section: 'KPI',
        Metric: this.t(k.title),
        Value: k.value,
        'Change %': `${k.changePercent}%`,
      })),
      // Top articles section
      ...this.tableRows.map(r => ({
        Section: 'Top Articles',
        Metric: r.name,
        Value: r.amount,
        'Change %': `${r.ratePercent}%`,
      })),
      // Location distribution section
      ...this.donutData.map(d => ({
        Section: 'Location Distribution',
        Metric: d.label,
        Value: d.amount,
        'Change %': `${(d.value as number).toFixed(1)}%`,
      })),
      // Movements section
      ...this.stackedBarData.map(m => ({
        Section: 'Movements',
        Metric: m.period,
        Value: m.total.toString(),
        'Change %': '',
      })),
    ];

    this.dialogService.create({
      zTitle: this.t('dashboard.export'),
      zContent: DataExportContentComponent,
      zHideFooter: true,
      zCustomClasses: 'sm:max-w-md',
      zData: {
        config: {
          title: 'Dashboard',
          endpoint: '',
          data: exportData,
          filename: `dashboard_${new Date().toISOString().split('T')[0]}`,
        },
      },
    });
  }

  kpiAccentColor(icon: string): string {
    const map: Record<string, string> = {
      package: '#3b82f6',
      trend:   '#10b981',
      alert:   '#f97316',
    };
    return map[icon] ?? 'var(--primary)';
  }

  kpiIconBg(icon: string): string {
    const map: Record<string, string> = {
      package: 'rgba(59,130,246,0.1)',
      trend:   'rgba(16,185,129,0.1)',
      alert:   'rgba(249,115,22,0.1)',
    };
    return map[icon] ?? 'var(--muted)';
  }

  t(key: string): string {
    return this.languageService.t(key);
  }
}
