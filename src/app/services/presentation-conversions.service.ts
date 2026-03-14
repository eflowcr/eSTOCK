import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import {
  PresentationConversion,
  CreatePresentationConversionRequest,
  UpdatePresentationConversionRequest,
} from '@app/models/presentation-conversion.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/presentation-conversions';
const BASE_URL = returnCompleteURI({
  URI: environment.API.BASE,
  API_Gateway: GATEWAY,
});

@Injectable({ providedIn: 'root' })
export class PresentationConversionsService {
  constructor(private fetchService: FetchService) {}

  getList(): Promise<ApiResponse<PresentationConversion[]>> {
    return this.fetchService.get<ApiResponse<PresentationConversion[]>>({
      API_Gateway: `${BASE_URL}/`,
    });
  }

  getListAdmin(): Promise<ApiResponse<PresentationConversion[]>> {
    return this.fetchService.get<ApiResponse<PresentationConversion[]>>({
      API_Gateway: `${BASE_URL}/admin`,
    });
  }

  getById(id: string): Promise<ApiResponse<PresentationConversion>> {
    return this.fetchService.get<ApiResponse<PresentationConversion>>({
      API_Gateway: `${BASE_URL}/${id}`,
    });
  }

  create(data: CreatePresentationConversionRequest): Promise<ApiResponse<PresentationConversion>> {
    return this.fetchService.post<ApiResponse<PresentationConversion>>({
      API_Gateway: `${BASE_URL}/`,
      values: data,
    });
  }

  update(id: string, data: UpdatePresentationConversionRequest): Promise<ApiResponse<PresentationConversion>> {
    return this.fetchService.put<ApiResponse<PresentationConversion>>({
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
