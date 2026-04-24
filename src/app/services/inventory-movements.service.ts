import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { InventoryMovement, InventoryMovementFilters, MonthlyMovements } from '@app/models/inventory-movement.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/inventory-movements';
export const INVENTORY_MOVEMENTS_URL = returnCompleteURI({
  URI: environment.API.BASE,
  API_Gateway: GATEWAY,
});

@Injectable({ providedIn: 'root' })
export class InventoryMovementsService {
  constructor(private fetchService: FetchService) {}

  async getAll(filters?: InventoryMovementFilters): Promise<ApiResponse<InventoryMovement[]>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params.append(k, String(v));
        }
      });
    }
    const qs = params.toString();
    return this.fetchService.get<ApiResponse<InventoryMovement[]>>({
      API_Gateway: qs ? `${INVENTORY_MOVEMENTS_URL}/?${qs}` : `${INVENTORY_MOVEMENTS_URL}/`,
    });
  }

  async getMovementsByMonth(months = 6): Promise<MonthlyMovements[]> {
    const now = new Date();
    const from = new Date(now);
    from.setMonth(now.getMonth() - months);
    const fromISO = from.toISOString().slice(0, 10);
    const toISO = now.toISOString().slice(0, 10);

    const response = await this.getAll({ from: fromISO, to: toISO, limit: 5000 });

    if (!response?.result?.success || !response.data?.length) {
      return this.emptyMonths(months);
    }

    return this.aggregateByMonth(response.data, months);
  }

  private aggregateByMonth(movements: InventoryMovement[], months: number): MonthlyMovements[] {
    const buckets = new Map<string, MonthlyMovements>();

    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.set(key, { month: key, receiving: 0, picking: 0, adjustment: 0 });
    }

    for (const mv of movements) {
      const key = mv.created_at.slice(0, 7);
      const bucket = buckets.get(key);
      if (!bucket) continue;

      const value = mv.unit_cost != null
        ? Math.abs(mv.quantity) * mv.unit_cost
        : Math.abs(mv.quantity);

      if (mv.reference_type === 'receiving_task' || mv.movement_type === 'inbound') {
        bucket.receiving += value;
      } else if (mv.reference_type === 'picking_task' || mv.movement_type === 'outbound') {
        bucket.picking += value;
      } else {
        bucket.adjustment += value;
      }
    }

    return Array.from(buckets.values());
  }

  private emptyMonths(months: number): MonthlyMovements[] {
    const now = new Date();
    return Array.from({ length: months }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return { month, receiving: 0, picking: 0, adjustment: 0 };
    });
  }
}
