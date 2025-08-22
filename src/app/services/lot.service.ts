import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { Lot, CreateLotRequest, UpdateLotRequest, LotSearchParams } from '@app/models/lot.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/lots';
export const LOT_URL = returnCompleteURI({
	URI: environment.API.BASE,
	API_Gateway: GATEWAY,
});

@Injectable({
	providedIn: 'root',
})
export class LotService {
	constructor(private fetchService: FetchService) {}

	/**
	 * @description Get all lots
	 * @returns Promise<ApiResponse<Lot[]>>
	 */
	async getAll(): Promise<ApiResponse<Lot[]>> {
		return await this.fetchService.get<ApiResponse<Lot[]>>({
			API_Gateway: `${LOT_URL}/`,
		});
	}

	/**
	 * @description Get lots by SKU
	 * @param sku Article SKU
	 * @returns Promise<ApiResponse<Lot[]>>
	 */
	async getBySku(sku: string): Promise<ApiResponse<Lot[]>> {
		return await this.fetchService.get<ApiResponse<Lot[]>>({
			API_Gateway: `${LOT_URL}/${sku}`,
		});
	}

	/**
	 * @description Create new lot
	 * @param lot Lot data
	 * @returns Promise<ApiResponse<any>>
	 */
	async create(lot: CreateLotRequest): Promise<ApiResponse<any>> {
		return await this.fetchService.post<ApiResponse<any>>({
			API_Gateway: `${LOT_URL}/`,
			values: lot,
		});
	}

	/**
	 * @description Update lot by ID
	 * @param id Lot ID
	 * @param data Partial lot data
	 * @returns Promise<ApiResponse<any>>
	 */
	async update(id: number, data: UpdateLotRequest): Promise<ApiResponse<any>> {
		return await this.fetchService.put<ApiResponse<any>>({
			API_Gateway: `${LOT_URL}/${id}`,
			values: data,
		});
	}

	/**
	 * @description Delete lot by ID
	 * @param id Lot ID
	 * @returns Promise<ApiResponse<any>>
	 */
	async delete(id: number): Promise<ApiResponse<any>> {
		return await this.fetchService.delete<ApiResponse<any>>({
			API_Gateway: `${LOT_URL}/${id}`,
		});
	}

	/**
	 * @description Search lots with filters
	 * @param params Search parameters
	 * @returns Promise<ApiResponse<Lot[]>>
	 */
	async search(params: LotSearchParams): Promise<ApiResponse<Lot[]>> {
		const searchParams = new URLSearchParams();
		
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null && value !== '') {
				searchParams.append(key, value.toString());
			}
		});

		const queryString = searchParams.toString();
		const url = queryString ? `${LOT_URL}/?${queryString}` : `${LOT_URL}/`;

		return await this.fetchService.get<ApiResponse<Lot[]>>({
			API_Gateway: url,
		});
	}
}
