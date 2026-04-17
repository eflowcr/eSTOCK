export type RotationStrategy = 'fifo' | 'fefo';

export interface Article {
	id: number | string;
	sku: string;
	name: string;
	description?: string | null;
	unit_price?: number | null;
	presentation: string;
	track_by_lot: boolean;
	track_by_serial: boolean;
	track_expiration: boolean;
	rotation_strategy?: RotationStrategy | string;
	min_quantity?: number | null;
	max_quantity?: number | null;
	image_url?: string | null;
	is_active?: boolean | null;
	created_at: string;
	updated_at: string;
	// S2 extended fields
	category_id?: string | null;
	category?: { id: string; name: string };
	shelf_life_in_days?: number | null;
	safety_stock?: number;
	batch_number_series?: string | null;
	serial_number_series?: string | null;
	min_order_qty?: number;
	default_location_id?: string | null;
	default_location?: { id: string; code: string; name: string };
	receiving_notes?: string | null;
	shipping_notes?: string | null;
}

export interface CreateArticleRequest {
	sku: string;
	name: string;
	description?: string;
	unit_price?: number;
	presentation: string;
	track_by_lot: boolean;
	track_by_serial: boolean;
	track_expiration: boolean;
	rotation_strategy?: RotationStrategy;
	min_quantity?: number;
	max_quantity?: number;
	image_url?: string;
	is_active?: boolean;
}

export interface UpdateArticleRequest extends Partial<CreateArticleRequest> {
	id?: number;
}

export interface ArticleSearchParams {
	search?: string;
	sku?: string;
	name?: string;
	presentation?: string;
	track_by_lot?: boolean;
	track_by_serial?: boolean;
	track_expiration?: boolean;
	rotation_strategy?: RotationStrategy;
	is_active?: boolean;
	page?: number;
	limit?: number;
	sort_by?: string;
	sort_order?: 'asc' | 'desc';
}
