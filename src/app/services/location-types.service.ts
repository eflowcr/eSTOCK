import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import {
  LocationType,
  CreateLocationTypeRequest,
  UpdateLocationTypeRequest,
} from '@app/models/location-type.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/location-types';
const LOCATION_TYPES_URL = returnCompleteURI({
  URI: environment.API.BASE,
  API_Gateway: GATEWAY,
});

@Injectable({ providedIn: 'root' })
export class LocationTypesService {
  constructor(private fetchService: FetchService) {}

  /** Active types for dropdown (e.g. location form). */
  async getList(): Promise<ApiResponse<LocationType[]>> {
    return await this.fetchService.get<ApiResponse<LocationType[]>>({
      API_Gateway: `${LOCATION_TYPES_URL}/`,
    });
  }

  /** All types for admin list (including inactive). */
  async getListAdmin(): Promise<ApiResponse<LocationType[]>> {
    return await this.fetchService.get<ApiResponse<LocationType[]>>({
      API_Gateway: `${LOCATION_TYPES_URL}/admin`,
    });
  }

  async getById(id: string): Promise<ApiResponse<LocationType>> {
    return await this.fetchService.get<ApiResponse<LocationType>>({
      API_Gateway: `${LOCATION_TYPES_URL}/${id}`,
    });
  }

  async create(data: CreateLocationTypeRequest): Promise<ApiResponse<LocationType>> {
    return await this.fetchService.post<ApiResponse<LocationType>>({
      API_Gateway: `${LOCATION_TYPES_URL}/`,
      values: data,
    });
  }

  async update(id: string, data: UpdateLocationTypeRequest): Promise<ApiResponse<LocationType>> {
    return await this.fetchService.put<ApiResponse<LocationType>>({
      API_Gateway: `${LOCATION_TYPES_URL}/${id}`,
      values: data,
    });
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    return await this.fetchService.delete<ApiResponse<void>>({
      API_Gateway: `${LOCATION_TYPES_URL}/${id}`,
    });
  }
}
