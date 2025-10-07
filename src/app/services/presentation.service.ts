import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { Presentation } from '@app/models/presentation.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/presentations';
export const PRESENTATION_URL = returnCompleteURI({
	URI: environment.API.BASE,
	API_Gateway: GATEWAY,
});

@Injectable({
	providedIn: 'root',
})
export class PresentationService {
	constructor(private fetchService: FetchService) {}

	/**
	 * @description Get all presentations
	 */
	async getAll(): Promise<ApiResponse<Presentation[]>> {
		return await this.fetchService.get<ApiResponse<Presentation[]>>({
			API_Gateway: `${PRESENTATION_URL}/`,
		});
	}

	/**
	 * @description Get presentation by ID
	 */
	async getById(id: string): Promise<ApiResponse<Presentation>> {
		return await this.fetchService.get<ApiResponse<Presentation>>({
			API_Gateway: `${PRESENTATION_URL}/${id}`,
		});
	}

	/**
	 * @description Create a new presentation
	 */
	async create(data: Partial<Presentation>): Promise<ApiResponse<any>> {
		return await this.fetchService.post<ApiResponse<any>>({
			API_Gateway: `${PRESENTATION_URL}/`,
			values: data,
		});
	}

	/**
	 * @description Update a presentation by ID
	 */
	async update(id: string, data: Partial<Presentation>): Promise<ApiResponse<any>> {
		return await this.fetchService.patch<ApiResponse<any>>({
			API_Gateway: `${PRESENTATION_URL}/${id}`,
			values: data,
		});
	}

	/**
	 * @description Delete a presentation by ID
	 */
	async delete(id: string): Promise<ApiResponse<any>> {
		return await this.fetchService.delete<ApiResponse<any>>({
			API_Gateway: `${PRESENTATION_URL}/${id}`,
		});
	}
}
