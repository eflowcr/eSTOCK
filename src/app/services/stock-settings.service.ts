import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { StockSettings } from '@app/models/stock-settings.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/settings/stock';
export const STOCK_SETTINGS_URL = returnCompleteURI({
  URI: environment.API.BASE,
  API_Gateway: GATEWAY,
});

@Injectable({ providedIn: 'root' })
export class StockSettingsService {
  constructor(private fetchService: FetchService) {}

  async get(): Promise<ApiResponse<StockSettings>> {
    return this.fetchService.get<ApiResponse<StockSettings>>({
      API_Gateway: STOCK_SETTINGS_URL,
    });
  }

  async update(payload: Partial<StockSettings>): Promise<ApiResponse<StockSettings>> {
    return this.fetchService.patch<ApiResponse<StockSettings>>({
      API_Gateway: STOCK_SETTINGS_URL,
      values: payload,
    });
  }
}
