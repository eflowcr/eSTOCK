import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { InventoryLot, InventoryLotSearchParams } from '@app/models/inventory-lot.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/inventory-lots';
export const INVENTORY_LOTS_URL = returnCompleteURI({
  URI: environment.API.BASE,
  API_Gateway: GATEWAY,
});

@Injectable({ providedIn: 'root' })
export class InventoryLotsService {
  constructor(private fetchService: FetchService) {}

  async getAll(params?: InventoryLotSearchParams): Promise<ApiResponse<InventoryLot[]>> {
    if (!params) {
      return this.fetchService.get<ApiResponse<InventoryLot[]>>({
        API_Gateway: `${INVENTORY_LOTS_URL}/`,
      });
    }
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString());
      }
    });
    const qs = searchParams.toString();
    return this.fetchService.get<ApiResponse<InventoryLot[]>>({
      API_Gateway: qs ? `${INVENTORY_LOTS_URL}/?${qs}` : `${INVENTORY_LOTS_URL}/`,
    });
  }
}
