import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import {
  DashboardStats,
  StockAlert,
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

  async getStats(): Promise<ApiResponse<DashboardStats>> {
    return await this.fetchService.get<ApiResponse<DashboardStats>>({
      API_Gateway: `${DASHBOARD_URL}/stats`,
    });
  }

  /** KPI cards with trend (from stats + mock trend until backend supports it) */
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
        changePercent: 15.8,
        changeLabel: 'dashboard.vs_last_month',
        icon: 'package',
      },
      {
        title: 'inventory_value',
        value: `$${stats.inventoryValue.toLocaleString()}`,
        changePercent: -34,
        changeLabel: 'dashboard.vs_last_month',
        icon: 'trend',
      },
      {
        title: 'low_stock_count',
        value: stats.lowStockCount.toLocaleString(),
        changePercent: 24.2,
        changeLabel: 'dashboard.alerts_trend',
        icon: 'alert',
      },
    ];
  }

  /** Stacked bar: movements overview by month (Inbound / Outbound / Adjusted) */
  async getStackedBarData(): Promise<StackedBarPoint[]> {
    return [
      {
        period: 'Oct',
        total: 2988.2,
        segments: [
          { label: 'Inbound', key: 'inbound', value: 1200, color: 'var(--chart-1)' },
          { label: 'Outbound', key: 'outbound', value: 1000, color: 'var(--chart-2)' },
          { label: 'Adjusted', key: 'adjusted', value: 788.2, color: 'var(--chart-3)' },
        ],
      },
      {
        period: 'Nov',
        total: 1765.09,
        segments: [
          { label: 'Inbound', key: 'inbound', value: 800, color: 'var(--chart-1)' },
          { label: 'Outbound', key: 'outbound', value: 650, color: 'var(--chart-2)' },
          { label: 'Adjusted', key: 'adjusted', value: 315.09, color: 'var(--chart-3)' },
        ],
      },
      {
        period: 'Dec',
        total: 4005.65,
        segments: [
          { label: 'Inbound', key: 'inbound', value: 1800, color: 'var(--chart-1)' },
          { label: 'Outbound', key: 'outbound', value: 1500, color: 'var(--chart-2)' },
          { label: 'Adjusted', key: 'adjusted', value: 705.65, color: 'var(--chart-3)' },
        ],
      },
    ];
  }

  /** Tasks (receiving + picking) by day for current week */
  async getTasksByDay(): Promise<{ day: string; count: number }[]> {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map((day, i) => ({
      day,
      count: [2100, 2800, 3874, 3200, 2900, 3100, 2650][i],
    }));
  }

  /** Donut: inventory distribution by location or type */
  async getDonutData(): Promise<DonutSlice[]> {
    return [
      { label: 'Location A', value: 45, amount: '$374.82', color: 'var(--chart-1)' },
      { label: 'Location B', value: 30, amount: '$241.60', color: 'var(--chart-2)' },
      { label: 'Other', value: 25, amount: '$213.42', color: 'var(--chart-3)' },
    ];
  }

  /** Table: top articles or integrations */
  async getTopArticlesTable(): Promise<DashboardTableRow[]> {
    return [
      { id: '1', name: 'Article Alpha', type: 'SKU', ratePercent: 40, amount: '$650.00' },
      { id: '2', name: 'Article Beta', type: 'Lot', ratePercent: 80, amount: '$720.50' },
      { id: '3', name: 'Article Gamma', type: 'SKU', ratePercent: 20, amount: '$432.25' },
    ];
  }

  async getRecentActivity(): Promise<{ id: number; type: string; message: string; time: string }[]> {
    return [
      { id: 1, type: 'completed', message: 'Tarea de recepción completada RCV-001', time: '2h' },
      { id: 2, type: 'created', message: 'Nuevo SKU agregado SKU-12453', time: '4h' },
      { id: 3, type: 'adjustment', message: 'Ajuste de stock para SKU-98765', time: '6h' },
    ];
  }

  async getMovementChartData(): Promise<{ date: string; inbound: number; outbound: number }[]> {
    const today = new Date();
    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - idx));
      return {
        date: d.toISOString().slice(0, 10),
        inbound: Math.floor(20 + Math.random() * 40),
        outbound: Math.floor(15 + Math.random() * 35),
      };
    });
  }

  async getStockAlerts(): Promise<StockAlert[]> {
    return [
      { id: '1', sku: 'SKU-12453', currentStock: 3, alertLevel: 'critical' },
      { id: '2', sku: 'SKU-98765', currentStock: 8, alertLevel: 'high' },
      { id: '3', sku: 'SKU-55555', currentStock: 15, alertLevel: 'medium' },
    ];
  }
}


