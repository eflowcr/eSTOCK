import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { DashboardStats, StockAlert } from '@app/models/dashboard.model';
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

  // Temporary simulated endpoints for charts and alerts until backend exists
  async getRecentActivity(): Promise<{ id: number; type: string; message: string; time: string; }[]> {
    return [
      { id: 1, type: 'completed', message: 'Tarea de recepción completada RCV-001', time: '2h' },
      { id: 2, type: 'created', message: 'Nuevo SKU agregado SKU-12453', time: '4h' },
      { id: 3, type: 'adjustment', message: 'Ajuste de stock para SKU-98765', time: '6h' },
    ];
  }

  async getMovementChartData(): Promise<{ date: string; inbound: number; outbound: number; }[]> {
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


