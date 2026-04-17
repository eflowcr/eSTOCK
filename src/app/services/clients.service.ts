import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { Client, ClientListFilters } from '@app/models/client.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/clients';
export const CLIENTS_URL = returnCompleteURI({
  URI: environment.API.BASE,
  API_Gateway: GATEWAY,
});

const RECEIVING_URL = returnCompleteURI({
  URI: environment.API.BASE,
  API_Gateway: '/receiving-tasks',
});

const PICKING_URL = returnCompleteURI({
  URI: environment.API.BASE,
  API_Gateway: '/picking-tasks',
});

@Injectable({ providedIn: 'root' })
export class ClientsService {
  constructor(private fetchService: FetchService) {}

  async list(filters?: ClientListFilters): Promise<ApiResponse<Client[]>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params.append(k, String(v));
        }
      });
    }
    const qs = params.toString();
    return this.fetchService.get<ApiResponse<Client[]>>({
      API_Gateway: qs ? `${CLIENTS_URL}?${qs}` : `${CLIENTS_URL}`,
    });
  }

  async getById(id: string): Promise<ApiResponse<Client>> {
    return this.fetchService.get<ApiResponse<Client>>({
      API_Gateway: `${CLIENTS_URL}/${id}`,
    });
  }

  async create(payload: Omit<Client, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Client>> {
    return this.fetchService.post<ApiResponse<Client>>({
      API_Gateway: CLIENTS_URL,
      values: payload,
    });
  }

  async update(id: string, payload: Partial<Client>): Promise<ApiResponse<Client>> {
    return this.fetchService.patch<ApiResponse<Client>>({
      API_Gateway: `${CLIENTS_URL}/${id}`,
      values: payload,
    });
  }

  async softDelete(id: string): Promise<ApiResponse<void>> {
    return this.fetchService.delete<ApiResponse<void>>({
      API_Gateway: `${CLIENTS_URL}/${id}`,
    });
  }

  async linkSupplier(receivingTaskId: string, supplierId: string | null): Promise<ApiResponse<void>> {
    return this.fetchService.patch<ApiResponse<void>>({
      API_Gateway: `${RECEIVING_URL}/${receivingTaskId}/supplier`,
      values: { supplier_id: supplierId },
    });
  }

  async linkCustomer(pickingTaskId: string, customerId: string | null): Promise<ApiResponse<void>> {
    return this.fetchService.patch<ApiResponse<void>>({
      API_Gateway: `${PICKING_URL}/${pickingTaskId}/customer`,
      values: { customer_id: customerId },
    });
  }
}
