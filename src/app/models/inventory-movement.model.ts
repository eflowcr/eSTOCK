export interface InventoryMovement {
	id: number;
	sku: string;
	location: string;
	movement_type: string;
	quantity: number;
	remaining_stock: number;
	reason?: string | null;
	created_by: string;
	created_at: string;
}
