import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { InventoryValuation, ValuationGroupBy } from '@app/models/inventory-valuation.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/inventory';
export const INVENTORY_VALUATION_URL = returnCompleteURI({
  URI: environment.API.BASE,
  API_Gateway: `${GATEWAY}/valuation`,
});

interface CacheEntry {
  data: InventoryValuation;
  ts: number;
}

const CACHE_TTL_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class InventoryValuationService {
  private cache = new Map<ValuationGroupBy, CacheEntry>();

  constructor(private fetchService: FetchService) {}

  async get(groupBy: ValuationGroupBy = 'article'): Promise<ApiResponse<InventoryValuation>> {
    const cached = this.cache.get(groupBy);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return { envelope: { transaction_type: '', encrypted: false, encryption_type: '' }, result: { success: true, message: 'cached', endpoint_code: '' }, data: cached.data };
    }

    const response = await this.fetchService.get<ApiResponse<InventoryValuation>>({
      API_Gateway: `${INVENTORY_VALUATION_URL}?group_by=${groupBy}`,
    });

    if (response?.result?.success && response.data) {
      this.cache.set(groupBy, { data: response.data, ts: Date.now() });
    }

    return response;
  }

  invalidateCache(): void {
    this.cache.clear();
  }
}
