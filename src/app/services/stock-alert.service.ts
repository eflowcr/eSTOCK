import { Injectable } from '@angular/core';
import { ApiResponse, StockAlert } from '@app/models';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';
import { StockAlertSearchParams, StockAlertResponse } from '@app/models/stock-alert.model';

const GATEWAY = '/stock-alerts';
export const STOCK_ALERT_URL = returnCompleteURI({
	URI: environment.API.BASE,
	API_Gateway: GATEWAY,
});

@Injectable({
	providedIn: 'root',
})
export class StockAlertService {
	constructor(private fetchService: FetchService) {}

	/**
	 * @description Get all stock alerts by resolved status
	 * @param resolved Resolved status
	 * @returns Promise<ApiResponse<StockAlert[]>>
	 */
	async getAll(resolved: boolean): Promise<ApiResponse<StockAlert[]>> {
		return await this.fetchService.get<ApiResponse<StockAlert[]>>({
			API_Gateway: `${STOCK_ALERT_URL}/${resolved}`,
		});
	}

	/**
	 * @description Trigger stock analysis
	 * @returns Promise<ApiResponse<StockAlertResponse>>
	 */
	async analyze(): Promise<ApiResponse<StockAlertResponse>> {
		return await this.fetchService.get<ApiResponse<StockAlertResponse>>({
			API_Gateway: `${STOCK_ALERT_URL}/analyze`,
		});
	}

	/**
	 * @description Get lot expiration alerts
	 * @returns Promise<ApiResponse<any>>
	 */
	async getLotExpirations(): Promise<ApiResponse<any>> {
		return await this.fetchService.get<ApiResponse<any>>({
			API_Gateway: `${STOCK_ALERT_URL}/lot-expiration`,
		});
	}

	/**
	 * @description Resolve a stock alert
	 * @param id Alert ID
	 * @returns Promise<ApiResponse<any>>
	 */
	async resolve(id: number): Promise<ApiResponse<any>> {
		return await this.fetchService.patch<ApiResponse<any>>({
			API_Gateway: `${STOCK_ALERT_URL}/${id}/resolve`,
			values: {},
		});
	}

	/**
	 * @description Export alerts to Excel
	 * @returns Promise<ApiResponse<any>>
	 */
	async export(): Promise<ApiResponse<any>> {
		return await this.fetchService.get<ApiResponse<any>>({
			API_Gateway: `${STOCK_ALERT_URL}/export`,
		});
	}

	/**
	 * @description Search stock alerts with filters
	 * @param params Search parameters
	 * @returns Promise<ApiResponse<StockAlert[]>>
	 */
	async search(params: StockAlertSearchParams): Promise<ApiResponse<StockAlert[]>> {
		const searchParams = new URLSearchParams();

		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null && value !== '') {
				searchParams.append(key, value.toString());
			}
		});

		const queryString = searchParams.toString();
		const url = queryString ? `${STOCK_ALERT_URL}/?${queryString}` : `${STOCK_ALERT_URL}/`;

		return await this.fetchService.get<ApiResponse<StockAlert[]>>({
			API_Gateway: url,
		});
	}
}
