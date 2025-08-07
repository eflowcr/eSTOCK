import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { EnhancedInventory, Inventory } from '@app/models/inventory.model';
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
	 * @description Get all inventory items (enhanced with product details)
	 */
	async getAll(): Promise<ApiResponse<EnhancedInventory[]>> {
		return await this.fetchService.get<ApiResponse<EnhancedInventory[]>>({
			API_Gateway: `${INVENTORY_URL}/`,
		});
	}

	/**
	 * @description Get inventory item by ID
	 */
	async getById(id: string): Promise<ApiResponse<EnhancedInventory>> {
		return await this.fetchService.get<ApiResponse<EnhancedInventory>>({
			API_Gateway: `${INVENTORY_URL}/${id}`,
		});
	}

	/**
	 * @description Get inventory items by SKU
	 */
	async getBySku(sku: string): Promise<ApiResponse<EnhancedInventory[]>> {
		return await this.fetchService.get<ApiResponse<EnhancedInventory[]>>({
			API_Gateway: `${INVENTORY_URL}/sku/${sku}`,
		});
	}

	/**
	 * @description Get inventory items by location
	 */
	async getByLocation(location: string): Promise<ApiResponse<EnhancedInventory[]>> {
		return await this.fetchService.get<ApiResponse<EnhancedInventory[]>>({
			API_Gateway: `${INVENTORY_URL}/location/${location}`,
		});
	}

	/**
	 * @description Create a new inventory item
	 */
	async create(data: Partial<Inventory>): Promise<ApiResponse<any>> {
		return await this.fetchService.post<ApiResponse<any>>({
			API_Gateway: `${INVENTORY_URL}/`,
			values: data,
		});
	}

	/**
	 * @description Update an inventory item by ID
	 */
	async update(id: string, data: Partial<Inventory>): Promise<ApiResponse<any>> {
		return await this.fetchService.put<ApiResponse<any>>({
			API_Gateway: `${INVENTORY_URL}/${id}`,
			values: data,
		});
	}

	/**
	 * @description Update inventory quantity
	 */
	async updateQuantity(id: string, quantity: number): Promise<ApiResponse<any>> {
		return await this.fetchService.put<ApiResponse<any>>({
			API_Gateway: `${INVENTORY_URL}/${id}/quantity`,
			values: { quantity },
		});
	}

	/**
	 * @description Delete an inventory item by ID
	 */
	async delete(id: string): Promise<ApiResponse<any>> {
		return await this.fetchService.delete<ApiResponse<any>>({
			API_Gateway: `${INVENTORY_URL}/${id}`,
		});
	}

	/**
	 * @description Search inventory items
	 */
	async search(params: {
		query?: string;
		sku?: string;
		location?: string;
		status?: string;
		min_quantity?: number;
		max_quantity?: number;
	}): Promise<ApiResponse<EnhancedInventory[]>> {
		const queryParams = new URLSearchParams();
		
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null && value !== '') {
				queryParams.append(key, value.toString());
			}
		});

		const queryString = queryParams.toString();
		const url = queryString ? `${INVENTORY_URL}/search?${queryString}` : `${INVENTORY_URL}/search`;

		return await this.fetchService.get<ApiResponse<EnhancedInventory[]>>({
			API_Gateway: url,
		});
	}

	/**
	 * @description Get low stock items
	 */
	async getLowStock(): Promise<ApiResponse<EnhancedInventory[]>> {
		return await this.fetchService.get<ApiResponse<EnhancedInventory[]>>({
			API_Gateway: `${INVENTORY_URL}/low-stock`,
		});
	}

	/**
	 * @description Get inventory movements/history
	 */
	async getMovements(inventoryId: string): Promise<ApiResponse<any[]>> {
		return await this.fetchService.get<ApiResponse<any[]>>({
			API_Gateway: `${INVENTORY_URL}/${inventoryId}/movements`,
		});
	}

	/**
	 * @description Import inventory from Excel file
	 */
	async importFile(file: File): Promise<ApiResponse<any>> {
		const formData = new FormData();
		formData.append('file', file);

		return await this.fetchService.post<ApiResponse<any>>({
			API_Gateway: `${INVENTORY_URL}/import/`,
			values: formData,
		});
	}

	/**
	 * @description Export inventory to Excel
	 */
	async exportFile(format: string = 'xlsx'): Promise<Blob> {
		return await this.fetchService.download({
			API_Gateway: `${INVENTORY_URL}/export/?format=${format}`,
		});
	}

	/**
	 * @description Perform inventory adjustment
	 */
	async adjustInventory(data: {
		inventory_id: number;
		adjustment_type: 'IN' | 'OUT' | 'ADJUSTMENT';
		quantity: number;
		reason: string;
		reference?: string;
	}): Promise<ApiResponse<any>> {
		return await this.fetchService.post<ApiResponse<any>>({
			API_Gateway: `${INVENTORY_URL}/adjust`,
			values: data,
		});
	}

	/**
	 * @description Transfer inventory between locations
	 */
	async transferInventory(data: {
		from_location: string;
		to_location: string;
		sku: string;
		quantity: number;
		reason?: string;
	}): Promise<ApiResponse<any>> {
		return await this.fetchService.post<ApiResponse<any>>({
			API_Gateway: `${INVENTORY_URL}/transfer`,
			values: data,
		});
	}
}
