import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import {
  DashboardStats,
  DashboardKpi,
  StackedBarPoint,
  DonutSlice,
  DashboardTableRow,
} from '@app/models/dashboard.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/dashboard';
export const DASHBOARD_URL = returnCompleteURI({
  URI: environment.API.BASE,
  API_Gateway: GATEWAY,
});

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  constructor(private fetchService: FetchService) {}

  async getStats(tasksPeriod = 'weekly', lowStockThreshold = 20): Promise<ApiResponse<DashboardStats>> {
    return await this.fetchService.get<ApiResponse<DashboardStats>>({
      API_Gateway: `${DASHBOARD_URL}/stats?tasksPeriod=${tasksPeriod}&lowStockThreshold=${lowStockThreshold}`,
    });
  }

  /** KPI cards with trend (tasksChangePercent and movChangePercent from real DB comparisons) */
  buildKpis(stats: DashboardStats | null): DashboardKpi[] {
    if (!stats) {
      return [
        { title: 'total_skus', value: '—', changePercent: 0, changeLabel: 'dashboard.vs_last_month', icon: 'package' },
        { title: 'inventory_value', value: '—', changePercent: 0, changeLabel: 'dashboard.vs_last_month', icon: 'trend' },
        { title: 'low_stock_count', value: '—', changePercent: 0, changeLabel: 'dashboard.alerts_trend', icon: 'alert' },
      ];
    }
    return [
      {
        title: 'total_skus',
        value: stats.totalSkus.toLocaleString(),
        changePercent: stats.movChangePercent ?? 0,
        changeLabel: 'dashboard.vs_last_month',
        icon: 'package',
      },
      {
        title: 'inventory_value',
        value: `$${stats.inventoryValue.toLocaleString()}`,
        changePercent: stats.movChangePercent ?? 0,
        changeLabel: 'dashboard.vs_last_month',
        icon: 'trend',
      },
      {
        title: 'low_stock_count',
        value: stats.lowStockCount.toLocaleString(),
        changePercent: stats.tasksChangePercent ?? 0,
        changeLabel: 'dashboard.alerts_trend',
        icon: 'alert',
      },
    ];
  }

  /** Stacked bar: movements by period — from /api/dashboard/movements-monthly?period= */
  async getStackedBarData(period = 'monthly'): Promise<StackedBarPoint[]> {
    const response = await this.fetchService.get<ApiResponse<{
      months: { period: string; total: number; inbound: number; outbound: number; adjusted: number }[];
    }>>({ API_Gateway: `${DASHBOARD_URL}/movements-monthly?period=${period}` });

    if (!response?.result?.success || !response.data?.months?.length) {
      return [];
    }

    return response.data.months.map((m) => ({
      period: m.period,
      total: m.total,
      segments: [
        { label: 'Inbound',  key: 'inbound',  value: m.inbound,  color: 'var(--chart-1)' },
        { label: 'Outbound', key: 'outbound', value: m.outbound, color: 'var(--chart-2)' },
        { label: 'Adjusted', key: 'adjusted', value: m.adjusted, color: 'var(--chart-3)' },
      ],
    }));
  }

  /** Tasks (receiving + picking) by day for current week — from stats.tasksThisWeek */
  getTasksByDay(stats: DashboardStats | null): { day: string; count: number }[] {
    if (stats?.tasksThisWeek?.length) {
      return stats.tasksThisWeek;
    }
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => ({ day, count: 0 }));
  }

  async getInventorySummary(period = 'monthly'): Promise<{ topArticles: DashboardTableRow[]; locationDistribution: DonutSlice[] }> {
    const response = await this.fetchService.get<ApiResponse<{
      topArticles: { id: string; name: string; type: string; ratePercent: number; amount: number }[];
      locationDistribution: { label: string; value: number; amount: number; color: string }[];
    }>>({ API_Gateway: `${DASHBOARD_URL}/inventory-summary?period=${period}` });

    if (!response?.result?.success || !response.data) {
      return { topArticles: [], locationDistribution: [] };
    }

    const topArticles: DashboardTableRow[] = response.data.topArticles.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      ratePercent: Math.round(a.ratePercent),
      amount: `$${a.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    }));

    const locationDistribution: DonutSlice[] = response.data.locationDistribution.map((l) => ({
      label: l.label,
      value: l.value,
      amount: `$${l.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      color: l.color,
    }));

    return { topArticles, locationDistribution };
  }

  /** Donut: inventory distribution by location — from getInventorySummary() */
  async getDonutData(): Promise<DonutSlice[]> {
    const { locationDistribution } = await this.getInventorySummary();
    return locationDistribution;
  }

  /** Table: top 5 articles by inventory value — from getInventorySummary() */
  async getTopArticlesTable(): Promise<DashboardTableRow[]> {
    const { topArticles } = await this.getInventorySummary();
    return topArticles;
  }

  /** Recent activity — last 10 from audit_logs (falls back to inventory_movements) */
  async getRecentActivity(): Promise<{ id: string; type: string; message: string; time: string }[]> {
    const response = await this.fetchService.get<ApiResponse<{
      activities: { id: string; type: string; message: string; user: string; time: string }[];
    }>>({ API_Gateway: `${DASHBOARD_URL}/activity` });

    if (!response?.result?.success || !response.data?.activities) {
      return [];
    }

    return response.data.activities.map((a) => ({
      id: a.id,
      type: a.type,
      message: a.message,
      time: a.time,
    }));
  }

  /** Last 7 days inbound/outbound movements — from stats.movementLast7Days */
  getMovementChartData(stats: DashboardStats | null): { date: string; inbound: number; outbound: number }[] {
    if (stats?.movementLast7Days?.length) {
      return stats.movementLast7Days;
    }
    const today = new Date();
    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - idx));
      return { date: d.toISOString().slice(0, 10), inbound: 0, outbound: 0 };
    });
  }

}


