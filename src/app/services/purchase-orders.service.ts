import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import {
  PurchaseOrder,
  PurchaseOrderListFilters,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
  SubmitPurchaseOrderResponse,
} from '@app/models/purchase-order.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/purchase-orders';
export const PURCHASE_ORDERS_URL = returnCompleteURI({
  URI: environment.API.BASE,
  API_Gateway: GATEWAY,
});

@Injectable({ providedIn: 'root' })
export class PurchaseOrdersService {
  constructor(private fetchService: FetchService) {}

  async list(filters?: PurchaseOrderListFilters): Promise<ApiResponse<PurchaseOrder[]>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params.append(k, String(v));
        }
      });
    }
    const qs = params.toString();
    return this.fetchService.get<ApiResponse<PurchaseOrder[]>>({
      API_Gateway: qs ? `${PURCHASE_ORDERS_URL}/?${qs}` : `${PURCHASE_ORDERS_URL}/`,
    });
  }

  async getById(id: string): Promise<ApiResponse<PurchaseOrder>> {
    return this.fetchService.get<ApiResponse<PurchaseOrder>>({
      API_Gateway: `${PURCHASE_ORDERS_URL}/${id}`,
    });
  }

  async create(payload: CreatePurchaseOrderRequest): Promise<ApiResponse<PurchaseOrder>> {
    return this.fetchService.post<ApiResponse<PurchaseOrder>>({
      API_Gateway: `${PURCHASE_ORDERS_URL}/`,
      values: payload,
    });
  }

  async update(id: string, payload: UpdatePurchaseOrderRequest): Promise<ApiResponse<PurchaseOrder>> {
    return this.fetchService.patch<ApiResponse<PurchaseOrder>>({
      API_Gateway: `${PURCHASE_ORDERS_URL}/${id}`,
      values: payload,
    });
  }

  async softDelete(id: string): Promise<ApiResponse<void>> {
    return this.fetchService.delete<ApiResponse<void>>({
      API_Gateway: `${PURCHASE_ORDERS_URL}/${id}`,
    });
  }

  async submit(id: string): Promise<ApiResponse<SubmitPurchaseOrderResponse>> {
    return this.fetchService.post<ApiResponse<SubmitPurchaseOrderResponse>>({
      API_Gateway: `${PURCHASE_ORDERS_URL}/${id}/submit`,
      values: {},
    });
  }

  async cancel(id: string): Promise<ApiResponse<PurchaseOrder>> {
    return this.fetchService.post<ApiResponse<PurchaseOrder>>({
      API_Gateway: `${PURCHASE_ORDERS_URL}/${id}/cancel`,
      values: {},
    });
  }
}
