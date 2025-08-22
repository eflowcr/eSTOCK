export interface Lot {
	id: number;
	lot_number: string;
	sku: string;
	quantity: number;
	expiration_date?: string | null;
	created_at: string;
	updated_at: string;
}

export interface CreateLotRequest {
	lot_number: string;
	sku: string;
	quantity: number;
	expiration_date?: string;
}

export interface UpdateLotRequest extends Partial<CreateLotRequest> {
	id?: number;
}

export interface LotSearchParams {
	search?: string;
	lot_number?: string;
	sku?: string;
	quantity?: number;
	expiration_date?: string;
	page?: number;
	limit?: number;
	sort_by?: string;
	sort_order?: 'asc' | 'desc';
}
