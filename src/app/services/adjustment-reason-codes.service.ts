import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import {
  AdjustmentReasonCode,
  CreateAdjustmentReasonCodeRequest,
  UpdateAdjustmentReasonCodeRequest,
} from '@app/models/adjustment-reason-code.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/adjustment-reason-codes';
const BASE_URL = returnCompleteURI({
  URI: environment.API.BASE,
  API_Gateway: GATEWAY,
});

@Injectable({ providedIn: 'root' })
export class AdjustmentReasonCodesService {
  constructor(private fetchService: FetchService) {}

  /** Active reason codes for dropdown (e.g. adjustment form). */
  getList(): Promise<ApiResponse<AdjustmentReasonCode[]>> {
    return this.fetchService.get<ApiResponse<AdjustmentReasonCode[]>>({
      API_Gateway: `${BASE_URL}/`,
    });
  }

  /** All reason codes for admin list (including inactive). */
  getListAdmin(): Promise<ApiResponse<AdjustmentReasonCode[]>> {
    return this.fetchService.get<ApiResponse<AdjustmentReasonCode[]>>({
      API_Gateway: `${BASE_URL}/admin`,
    });
  }

  getById(id: string): Promise<ApiResponse<AdjustmentReasonCode>> {
    return this.fetchService.get<ApiResponse<AdjustmentReasonCode>>({
      API_Gateway: `${BASE_URL}/${id}`,
    });
  }

  create(data: CreateAdjustmentReasonCodeRequest): Promise<ApiResponse<AdjustmentReasonCode>> {
    return this.fetchService.post<ApiResponse<AdjustmentReasonCode>>({
      API_Gateway: `${BASE_URL}/`,
      values: data,
    });
  }

  update(id: string, data: UpdateAdjustmentReasonCodeRequest): Promise<ApiResponse<AdjustmentReasonCode>> {
    return this.fetchService.put<ApiResponse<AdjustmentReasonCode>>({
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
