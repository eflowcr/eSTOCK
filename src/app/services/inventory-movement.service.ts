import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { InventoryMovement } from '@app/models/inventory-movement.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/inventory_movements';
export const INVENTORY_MOVEMENTS_URL = returnCompleteURI({
	URI: environment.API.BASE,
	API_Gateway: GATEWAY,
});

@Injectable({
	providedIn: 'root',
})
export class InventoryMovementService {
	constructor(private fetchService: FetchService) {}

	/**
	 * @description Get all inventory movements
	 * @returns Promise<ApiResponse<InventoryMovement[]>>
	 */
	async getAll(): Promise<ApiResponse<InventoryMovement[]>> {
		return await this.fetchService.get<ApiResponse<InventoryMovement[]>>({
			API_Gateway: `${INVENTORY_MOVEMENTS_URL}/`,
		});
	}

	/**
	 * @description Get inventory movements by SKU
	 * @param sku SKU to filter movements
	 * @returns Promise<ApiResponse<InventoryMovement[]>>
	 */
	async getMovementsBySku(sku: string): Promise<ApiResponse<InventoryMovement[]>> {
		return await this.fetchService.get<ApiResponse<InventoryMovement[]>>({
			API_Gateway: `${INVENTORY_MOVEMENTS_URL}/${sku}`,
		});
	}
}
