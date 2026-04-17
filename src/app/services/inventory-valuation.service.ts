import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { InventoryValuation, ValuationGroupBy } from '@app/models/inventory-valuation.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

export const VALUATION_URL = returnCompleteURI({
  URI: environment.API.BASE,
  API_Gateway: '/inventory/valuation',
});

@Injectable({ providedIn: 'root' })
export class InventoryValuationService {
  constructor(private fetchService: FetchService) {}

  async get(groupBy: ValuationGroupBy, activeOnly = true): Promise<ApiResponse<InventoryValuation>> {
    const params = new URLSearchParams({ group_by: groupBy, active_only: String(activeOnly) });
    return this.fetchService.get<ApiResponse<InventoryValuation>>({
      API_Gateway: `${VALUATION_URL}?${params.toString()}`,
    });
  }
}
