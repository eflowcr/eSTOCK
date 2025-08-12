export interface Serial {
	id: number;
	serial_number: string;
	sku: string;
	status: string;
	created_at: string;
	updated_at: string;
}

export interface CreateSerialRequest {
	serial_number: string;
	sku: string;
	status: string;
}

export interface UpdateSerialRequest extends Partial<CreateSerialRequest> {
	id?: number;
}

export interface SerialSearchParams {
	search?: string;
	serial_number?: string;
	sku?: string;
	status?: string;
	page?: number;
	limit?: number;
	sort_by?: string;
	sort_order?: 'asc' | 'desc';
}
