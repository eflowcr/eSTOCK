import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { Serial, CreateSerialRequest, UpdateSerialRequest, SerialSearchParams } from '@app/models/serial.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/serials';
export const SERIAL_URL = returnCompleteURI({
	URI: environment.API.BASE,
	API_Gateway: GATEWAY,
});

@Injectable({
	providedIn: 'root',
})
export class SerialService {
	constructor(private fetchService: FetchService) {}

	/**
	 * @description Get serial by ID
	 * @param id Serial ID
	 * @returns Promise<ApiResponse<Serial>>
	 */
	async getById(id: number): Promise<ApiResponse<Serial>> {
		return await this.fetchService.get<ApiResponse<Serial>>({
			API_Gateway: `${SERIAL_URL}/${id}`,
		});
	}

	/**
	 * @description Get serials by SKU
	 * @param sku Article SKU
	 * @returns Promise<ApiResponse<Serial[]>>
	 */
	async getBySku(sku: string): Promise<ApiResponse<Serial[]>> {
		return await this.fetchService.get<ApiResponse<Serial[]>>({
			API_Gateway: `${SERIAL_URL}/by-sku/${sku}`,
		});
	}

	/**
	 * @description Create new serial
	 * @param serial Serial data
	 * @returns Promise<ApiResponse<any>>
	 */
	async create(serial: CreateSerialRequest): Promise<ApiResponse<any>> {
		return await this.fetchService.post<ApiResponse<any>>({
			API_Gateway: `${SERIAL_URL}/`,
			values: serial,
		});
	}

	/**
	 * @description Update serial by ID
	 * @param id Serial ID
	 * @param data Partial serial data
	 * @returns Promise<ApiResponse<any>>
	 */
	async update(id: number, data: UpdateSerialRequest): Promise<ApiResponse<any>> {
		return await this.fetchService.put<ApiResponse<any>>({
			API_Gateway: `${SERIAL_URL}/${id}`,
			values: data,
		});
	}

	/**
	 * @description Delete serial by ID
	 * @param id Serial ID
	 * @returns Promise<ApiResponse<any>>
	 */
	async delete(id: number): Promise<ApiResponse<any>> {
		return await this.fetchService.delete<ApiResponse<any>>({
			API_Gateway: `${SERIAL_URL}/${id}`,
		});
	}

	/**
	 * @description Search serials with filters
	 * @param params Search parameters
	 * @returns Promise<ApiResponse<Serial[]>>
	 */
	async search(params: SerialSearchParams): Promise<ApiResponse<Serial[]>> {
		const searchParams = new URLSearchParams();
		
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null && value !== '') {
				searchParams.append(key, value.toString());
			}
		});

		const queryString = searchParams.toString();
		const url = queryString ? `${SERIAL_URL}/?${queryString}` : `${SERIAL_URL}/`;

		return await this.fetchService.get<ApiResponse<Serial[]>>({
			API_Gateway: url,
		});
	}
}
