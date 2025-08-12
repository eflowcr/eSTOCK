import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { Inventory, CreateInventoryRequest, UpdateInventoryRequest } from '@app/models/inventory.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/inventory';
export const INVENTORY_URL = returnCompleteURI({
	URI: environment.API.BASE,
	API_Gateway: GATEWAY,
});

@Injectable({
	providedIn: 'root',
})
export class InventoryService {
	constructor(private fetchService: FetchService) {}

	/**
	 * @description Get all inventory items
	 * @returns Promise<ApiResponse<Inventory[]>>
	 */
	async getAll(): Promise<ApiResponse<Inventory[]>> {
		return await this.fetchService.get<ApiResponse<Inventory[]>>({
			API_Gateway: `${INVENTORY_URL}/`,
		});
	}

	/**
	 * @description Create new inventory item
	 * @param inventory Inventory data
	 * @returns Promise<ApiResponse<any>>
	 */
	async create(inventory: CreateInventoryRequest): Promise<ApiResponse<any>> {
		return await this.fetchService.post<ApiResponse<any>>({
			API_Gateway: `${INVENTORY_URL}/`,
			values: inventory,
		});
	}

	/**
	 * @description Update inventory item by ID
	 * @param id Inventory ID
	 * @param data Partial inventory data
	 * @returns Promise<ApiResponse<any>>
	 */
	async update(id: number, data: UpdateInventoryRequest): Promise<ApiResponse<any>> {
		return await this.fetchService.put<ApiResponse<any>>({
			API_Gateway: `${INVENTORY_URL}/${id}`,
			values: data,
		});
	}

	/**
	 * @description Delete inventory item by ID and location
	 * @param id Inventory ID
	 * @param location Location
	 * @returns Promise<ApiResponse<any>>
	 */
	async delete(id: number, location: string): Promise<ApiResponse<any>> {
		return await this.fetchService.delete<ApiResponse<any>>({
			API_Gateway: `${INVENTORY_URL}/${id}/${location}`,
		});
	}
}
