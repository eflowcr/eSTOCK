import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { Adjustment, AdjustmentFormData } from '@app/models/adjustment.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/adjustments';
export const ADJUSTMENT_URL = returnCompleteURI({
	URI: environment.API.BASE,
	API_Gateway: GATEWAY,
});

@Injectable({
	providedIn: 'root',
})
export class AdjustmentService {
	constructor(private fetchService: FetchService) {}

	/**
	 * @description Get all adjustments
	 * @returns Promise<ApiResponse<Adjustment[]>>
	 */
	async getAll(): Promise<ApiResponse<Adjustment[]>> {
		return await this.fetchService.get<ApiResponse<Adjustment[]>>({
			API_Gateway: `${ADJUSTMENT_URL}/`,
		});
	}

	/**
	 * @description Get adjustment by ID
	 * @param id Adjustment ID
	 * @returns Promise<ApiResponse<Adjustment>>
	 */
	async getById(id: number): Promise<ApiResponse<Adjustment>> {
		return await this.fetchService.get<ApiResponse<Adjustment>>({
			API_Gateway: `${ADJUSTMENT_URL}/${id}`,
		});
	}

	/**
	 * @description Get adjustment details by ID
	 * @param id Adjustment ID
	 * @returns Promise<ApiResponse<any>>
	 */
	async getDetails(id: number): Promise<ApiResponse<any>> {
		return await this.fetchService.get<ApiResponse<any>>({
			API_Gateway: `${ADJUSTMENT_URL}/${id}/details`,
		});
	}

	/**
	 * @description Create new adjustment
	 * @param adjustment Adjustment data
	 * @returns Promise<ApiResponse<any>>
	 */
	async create(adjustment: AdjustmentFormData): Promise<ApiResponse<any>> {
		return await this.fetchService.post<ApiResponse<any>>({
			API_Gateway: `${ADJUSTMENT_URL}/`,
			values: adjustment,
		});
	}

	/**
	 * @description Export adjustments to file
	 * @param format Export format (csv or xlsx)
	 * @returns Promise<Blob>
	 */
	async exportFile(format: string = 'xlsx'): Promise<Blob> {
		return await this.fetchService.download({
			API_Gateway: `${ADJUSTMENT_URL}/export/?format=${format}`,
		});
	}
}
