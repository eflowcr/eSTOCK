import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import {
  SalesOrder,
  SalesOrderListFilters,
  CreateSalesOrderRequest,
  UpdateSalesOrderRequest,
  SubmitSalesOrderResponse,
  ConfirmSalesOrderResponse,
} from '@app/models/sales-order.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/sales-orders';
export const SALES_ORDERS_URL = returnCompleteURI({
  URI: environment.API.BASE,
  API_Gateway: GATEWAY,
});

@Injectable({ providedIn: 'root' })
export class SalesOrdersService {
  constructor(private fetchService: FetchService) {}

  async list(filters?: SalesOrderListFilters): Promise<ApiResponse<SalesOrder[]>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params.append(k, String(v));
        }
      });
    }
    const qs = params.toString();
    return this.fetchService.get<ApiResponse<SalesOrder[]>>({
      API_Gateway: qs ? `${SALES_ORDERS_URL}/?${qs}` : `${SALES_ORDERS_URL}/`,
    });
  }

  async getById(id: string): Promise<ApiResponse<SalesOrder>> {
    return this.fetchService.get<ApiResponse<SalesOrder>>({
      API_Gateway: `${SALES_ORDERS_URL}/${id}`,
    });
  }

  async create(payload: CreateSalesOrderRequest): Promise<ApiResponse<SalesOrder>> {
    return this.fetchService.post<ApiResponse<SalesOrder>>({
      API_Gateway: `${SALES_ORDERS_URL}/`,
      values: payload,
    });
  }

  async update(id: string, payload: UpdateSalesOrderRequest): Promise<ApiResponse<SalesOrder>> {
    return this.fetchService.patch<ApiResponse<SalesOrder>>({
      API_Gateway: `${SALES_ORDERS_URL}/${id}`,
      values: payload,
    });
  }

  async softDelete(id: string): Promise<ApiResponse<void>> {
    return this.fetchService.delete<ApiResponse<void>>({
      API_Gateway: `${SALES_ORDERS_URL}/${id}`,
    });
  }

  /** Submit a draft SO — backend endpoint POST /sales-orders/:id/confirm; status becomes 'submitted'. */
  async submit(id: string): Promise<ApiResponse<SubmitSalesOrderResponse>> {
    return this.fetchService.post<ApiResponse<SubmitSalesOrderResponse>>({
      API_Gateway: `${SALES_ORDERS_URL}/${id}/confirm`,
      values: {},
    });
  }

  /** @deprecated Use submit() — backend status is 'submitted' not 'confirmed'. */
  async confirm(id: string): Promise<ApiResponse<ConfirmSalesOrderResponse>> {
    return this.submit(id);
  }

  async cancel(id: string): Promise<ApiResponse<SalesOrder>> {
    return this.fetchService.post<ApiResponse<SalesOrder>>({
      API_Gateway: `${SALES_ORDERS_URL}/${id}/cancel`,
      values: {},
    });
  }
}
