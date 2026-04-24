export interface ArticleSupplier {
  id: string;
  article_sku: string;
  supplier_id: string;
  is_preferred: boolean;
  lead_time_days?: number;
  unit_cost?: number;
  supplier_sku?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // embeds
  supplier?: { id: string; code: string; name: string };
}

export interface ArticleSupplierCreateRequest {
  article_sku: string;
  supplier_id: string;
  is_preferred?: boolean;
  lead_time_days?: number;
  unit_cost?: number;
  supplier_sku?: string;
  notes?: string;
}

export interface ArticleSupplierUpdateRequest {
  is_preferred?: boolean;
  lead_time_days?: number;
  unit_cost?: number;
  supplier_sku?: string;
  notes?: string;
}

export interface ArticleSupplierListFilters {
  article_sku?: string;
  supplier_id?: string;
  is_preferred?: boolean;
}
