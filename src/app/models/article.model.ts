export interface Article {
	id: number;
	sku: string;
	name: string;
	description?: string | null;
	unit_price?: number | null;
	presentation: string;
	track_by_lot: boolean;
	track_by_serial: boolean;
	track_expiration: boolean;
	min_quantity?: number | null;
	max_quantity?: number | null;
	image_url?: string | null;
	is_active?: boolean | null;
	created_at: string;
	updated_at: string;
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
	is_active?: boolean;
	page?: number;
	limit?: number;
	sort_by?: string;
	sort_order?: 'asc' | 'desc';
}
