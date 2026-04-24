export type BackorderStatus = 'pending' | 'fulfilled' | 'cancelled';

export interface Backorder {
  id: string;
  original_sales_order_id: string;
  article_sku: string;
  remaining_qty: number;
  status: BackorderStatus;
  generated_picking_task_id?: string;
  fulfilled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BackorderListFilters {
  so_id?: string;
  // TODO(CS4): article_sku filter declared here but backend controller ignores it — implement or remove in S4.
  article_sku?: string;
  status?: BackorderStatus;
}
