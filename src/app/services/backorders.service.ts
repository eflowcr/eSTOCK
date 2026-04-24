import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { Backorder, BackorderListFilters } from '@app/models/backorder.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/backorders';
export const BACKORDERS_URL = returnCompleteURI({
  URI: environment.API.BASE,
  API_Gateway: GATEWAY,
});

@Injectable({ providedIn: 'root' })
export class BackordersService {
  constructor(private fetchService: FetchService) {}

  async list(filters?: BackorderListFilters): Promise<ApiResponse<Backorder[]>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params.append(k, String(v));
        }
      });
    }
    const qs = params.toString();
    return this.fetchService.get<ApiResponse<Backorder[]>>({
      API_Gateway: qs ? `${BACKORDERS_URL}/?${qs}` : `${BACKORDERS_URL}/`,
    });
  }

  async getById(id: string): Promise<ApiResponse<Backorder>> {
    return this.fetchService.get<ApiResponse<Backorder>>({
      API_Gateway: `${BACKORDERS_URL}/${id}`,
    });
  }

  async fulfill(id: string): Promise<ApiResponse<Backorder>> {
    return this.fetchService.post<ApiResponse<Backorder>>({
      API_Gateway: `${BACKORDERS_URL}/${id}/fulfill`,
      values: {},
    });
  }
}
