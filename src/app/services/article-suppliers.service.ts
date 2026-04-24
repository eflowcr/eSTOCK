import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import {
  ArticleSupplier,
  ArticleSupplierCreateRequest,
  ArticleSupplierUpdateRequest,
  ArticleSupplierListFilters,
} from '@app/models/article-supplier.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/article-suppliers';
export const ARTICLE_SUPPLIERS_URL = returnCompleteURI({
  URI: environment.API.BASE,
  API_Gateway: GATEWAY,
});

@Injectable({ providedIn: 'root' })
export class ArticleSuppliersService {
  constructor(private fetchService: FetchService) {}

  async list(filters?: ArticleSupplierListFilters): Promise<ApiResponse<ArticleSupplier[]>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params.append(k, String(v));
        }
      });
    }
    const qs = params.toString();
    return this.fetchService.get<ApiResponse<ArticleSupplier[]>>({
      API_Gateway: qs ? `${ARTICLE_SUPPLIERS_URL}/?${qs}` : `${ARTICLE_SUPPLIERS_URL}/`,
    });
  }

  async getById(id: string): Promise<ApiResponse<ArticleSupplier>> {
    return this.fetchService.get<ApiResponse<ArticleSupplier>>({
      API_Gateway: `${ARTICLE_SUPPLIERS_URL}/${id}`,
    });
  }

  async getBySku(sku: string): Promise<ApiResponse<ArticleSupplier[]>> {
    return this.fetchService.get<ApiResponse<ArticleSupplier[]>>({
      API_Gateway: `${ARTICLE_SUPPLIERS_URL}/?article_sku=${encodeURIComponent(sku)}`,
    });
  }

  async create(payload: ArticleSupplierCreateRequest): Promise<ApiResponse<ArticleSupplier>> {
    return this.fetchService.post<ApiResponse<ArticleSupplier>>({
      API_Gateway: `${ARTICLE_SUPPLIERS_URL}/`,
      values: payload,
    });
  }

  async update(id: string, payload: ArticleSupplierUpdateRequest): Promise<ApiResponse<ArticleSupplier>> {
    return this.fetchService.patch<ApiResponse<ArticleSupplier>>({
      API_Gateway: `${ARTICLE_SUPPLIERS_URL}/${id}`,
      values: payload,
    });
  }

  async softDelete(id: string): Promise<ApiResponse<void>> {
    return this.fetchService.delete<ApiResponse<void>>({
      API_Gateway: `${ARTICLE_SUPPLIERS_URL}/${id}`,
    });
  }
}
