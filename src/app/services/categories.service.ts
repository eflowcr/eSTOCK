import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { Category, CategoryTreeNode } from '@app/models/category.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/categories';
export const CATEGORIES_URL = returnCompleteURI({
  URI: environment.API.BASE,
  API_Gateway: GATEWAY,
});

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  constructor(private fetchService: FetchService) {}

  async list(): Promise<ApiResponse<Category[]>> {
    return this.fetchService.get<ApiResponse<Category[]>>({
      API_Gateway: CATEGORIES_URL,
    });
  }

  async tree(): Promise<ApiResponse<CategoryTreeNode[]>> {
    return this.fetchService.get<ApiResponse<CategoryTreeNode[]>>({
      API_Gateway: `${CATEGORIES_URL}/tree`,
    });
  }

  async getById(id: string): Promise<ApiResponse<Category>> {
    return this.fetchService.get<ApiResponse<Category>>({
      API_Gateway: `${CATEGORIES_URL}/${id}`,
    });
  }

  async create(payload: Omit<Category, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Category>> {
    return this.fetchService.post<ApiResponse<Category>>({
      API_Gateway: CATEGORIES_URL,
      values: payload,
    });
  }

  async update(id: string, payload: Partial<Category>): Promise<ApiResponse<Category>> {
    return this.fetchService.patch<ApiResponse<Category>>({
      API_Gateway: `${CATEGORIES_URL}/${id}`,
      values: payload,
    });
  }

  async softDelete(id: string): Promise<ApiResponse<void>> {
    return this.fetchService.delete<ApiResponse<void>>({
      API_Gateway: `${CATEGORIES_URL}/${id}`,
    });
  }
}
