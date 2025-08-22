import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { Location } from '@app/models/location.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/locations';
export const LOCATION_URL = returnCompleteURI({
	URI: environment.API.BASE,
	API_Gateway: GATEWAY,
});

@Injectable({
	providedIn: 'root',
})
export class LocationService {
	constructor(private fetchService: FetchService) {}

	/**
	 * @description Get all locations
	 */
	async getAll(): Promise<ApiResponse<Location[]>> {
		return await this.fetchService.get<ApiResponse<Location[]>>({
			API_Gateway: `${LOCATION_URL}/`,
		});
	}

	/**
	 * @description Get location by ID
	 */
	async getById(id: string): Promise<ApiResponse<Location>> {
		return await this.fetchService.get<ApiResponse<Location>>({
			API_Gateway: `${LOCATION_URL}/${id}`,
		});
	}

	/**
	 * @description Create a new location
	 */
	async create(data: Partial<Location>): Promise<ApiResponse<any>> {
		return await this.fetchService.post<ApiResponse<any>>({
			API_Gateway: `${LOCATION_URL}/`,
			values: data,
		});
	}

	/**
	 * @description Update a location by ID
	 */
	async update(id: string, data: Partial<Location>): Promise<ApiResponse<any>> {
		return await this.fetchService.put<ApiResponse<any>>({
			API_Gateway: `${LOCATION_URL}/${id}`,
			values: data,
		});
	}

	/**
	 * @description Delete a location by ID
	 */
	async delete(id: string): Promise<ApiResponse<any>> {
		return await this.fetchService.delete<ApiResponse<any>>({
			API_Gateway: `${LOCATION_URL}/${id}`,
		});
	}

	/**
	 * @description Import locations from Excel file
	 */
	async importFile(file: File): Promise<ApiResponse<any>> {
		const formData = new FormData();
		formData.append('file', file);

		return await this.fetchService.post<ApiResponse<any>>({
			API_Gateway: `${LOCATION_URL}/import/`,
			values: formData,
		});
	}

	/**
	 * @description Export locations to Excel
	 */
	async exportFile(format: string = 'xlsx'): Promise<Blob> {
		return await this.fetchService.download({
			API_Gateway: `${LOCATION_URL}/export/?format=${format}`,
		});
	}
}
