export interface Lot {
	id: number;
	lot_number: string;
	sku: string;
	quantity: number;
	expiration_date?: string;
	created_at: string;
	updated_at: string;
}

export interface Serial {
	id: number;
	serial_number: string;
	sku: string;
	status: string;
	created_at: string;
	updated_at: string;
}

export interface EnhancedInventory {
	id: number;
	sku: string;
	location: string;
	quantity: number;
	status: string;
	unit_price: number;
	created_at: string;
	updated_at: string;
	name: string;
	description: string;
	presentation: string;
	track_by_lot: boolean;
	track_by_serial: boolean;
	track_expiration: boolean;
	image_url: string;
	min_quantity: number;
	max_quantity: number;
	lots: Lot[];
	serials: Serial[];
}

export interface Inventory {
	id: number;
	sku: string;
	location: string;
	quantity: number;
	status: string;
	unit_price: number;
	created_at: string;
	updated_at: string;
}
