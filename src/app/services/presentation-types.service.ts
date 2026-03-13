import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import {
  PresentationType,
  CreatePresentationTypeRequest,
  UpdatePresentationTypeRequest,
} from '@app/models/presentation-type.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/presentation-types';
const BASE_URL = returnCompleteURI({
  URI: environment.API.BASE,
  API_Gateway: GATEWAY,
});

@Injectable({ providedIn: 'root' })
export class PresentationTypesService {
  constructor(private fetchService: FetchService) {}

  /** Active types for dropdown (e.g. article/inventory form). */
  getList(): Promise<ApiResponse<PresentationType[]>> {
    return this.fetchService.get<ApiResponse<PresentationType[]>>({
      API_Gateway: `${BASE_URL}/`,
    });
  }

  /** All types for admin list (including inactive). */
  getListAdmin(): Promise<ApiResponse<PresentationType[]>> {
    return this.fetchService.get<ApiResponse<PresentationType[]>>({
      API_Gateway: `${BASE_URL}/admin`,
    });
  }

  getById(id: string): Promise<ApiResponse<PresentationType>> {
    return this.fetchService.get<ApiResponse<PresentationType>>({
      API_Gateway: `${BASE_URL}/${id}`,
    });
  }

  create(data: CreatePresentationTypeRequest): Promise<ApiResponse<PresentationType>> {
    return this.fetchService.post<ApiResponse<PresentationType>>({
      API_Gateway: `${BASE_URL}/`,
      values: data,
    });
  }

  update(id: string, data: UpdatePresentationTypeRequest): Promise<ApiResponse<PresentationType>> {
    return this.fetchService.put<ApiResponse<PresentationType>>({
      API_Gateway: `${BASE_URL}/${id}`,
      values: data,
    });
  }

  delete(id: string): Promise<ApiResponse<void>> {
    return this.fetchService.delete<ApiResponse<void>>({
      API_Gateway: `${BASE_URL}/${id}`,
    });
  }
}
