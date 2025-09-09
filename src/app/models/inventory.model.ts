export interface Inventory {
	id: number;
	sku: string;
	name: string;
	description?: string | null;
	location: string;
	quantity: number;
	status: string;
	presentation: string;
	unit_price?: number | null;
	created_at: string;
	updated_at: string;
	track_by_lot: boolean;
	track_by_serial: boolean;
	track_expiration: boolean;
	image_url?: string | null;
	min_quantity?: number | null;
	max_quantity?: number | null;
	lots?: Lot[] | null;
	serials?: Serial[] | null;
}

export interface CreateInventoryRequest {
	sku: string;
	name: string;
	description?: string;
	location: string;
	quantity: number;
	status: string;
	presentation: string;
	unitPrice?: number;
	lots?: CreateLotRequest[];
	serialNumbers?: string[];
	trackByLot: boolean;
	trackBySerial: boolean;
}

export interface UpdateInventoryRequest extends Partial<CreateInventoryRequest> {
	id?: number;
}

export interface Lot {
	id: number;
	lot_number: string;
	lotNumber?: string; // For backward compatibility
	sku: string;
	quantity: number;
	expiration_date?: string | null;
	expirationDate?: string | null; // For backward compatibility
	created_at: string;
	updated_at: string;
}

export interface CreateLotRequest {
	lotNumber: string;
	quantity: number;
	expirationDate?: string;
}

export interface Serial {
	id: number;
	serial_number: string;
	serialNumber?: string; // For backward compatibility
	sku: string;
	status: string;
	created_at: string;
	updated_at: string;
}
