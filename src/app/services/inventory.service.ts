import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { Inventory, CreateInventoryRequest, UpdateInventoryRequest } from '@app/models/inventory.model';
import { PickSuggestion } from '@app/models/pick-suggestion.model';
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
	 * @description Get pick suggestions for a SKU: locations and lots sorted by rotation (FIFO/FEFO) then lowest quantity first.
	 */
	async getPickSuggestions(sku: string): Promise<ApiResponse<PickSuggestion[]>> {
		return await this.fetchService.get<ApiResponse<PickSuggestion[]>>({
			API_Gateway: `${INVENTORY_URL}/pick-suggestions/${encodeURIComponent(sku)}`,
		});
	}

	/**
	 * @description Get inventory by SKU and location (for add-quantity flow). Returns null if not found.
	 */
	async getBySkuAndLocation(sku: string, location: string): Promise<ApiResponse<Inventory> | null> {
		try {
			const res = await this.fetchService.get<ApiResponse<Inventory>>({
				API_Gateway: `${INVENTORY_URL}/sku/${encodeURIComponent(sku)}/location/${encodeURIComponent(location)}`,
			});
			return res;
		} catch {
			return null;
		}
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
		return await this.fetchService.patch<ApiResponse<any>>({
			API_Gateway: `${INVENTORY_URL}/id/${id}`,
			values: data,
		});
	}

	/**
	 * @description Delete inventory item by SKU and location
	 * @param sku Inventory SKU
	 * @param location Location
	 * @returns Promise<ApiResponse<any>>
	 */
	async delete(sku: string, location: string): Promise<ApiResponse<any>> {
		return await this.fetchService.delete<ApiResponse<any>>({
			API_Gateway: `${INVENTORY_URL}/id/${sku}/${location}`,
		});
	}
}
