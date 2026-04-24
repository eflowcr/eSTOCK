export type SalesOrderStatus = 'draft' | 'confirmed' | 'partial' | 'completed' | 'cancelled';

export interface SalesOrderItem {
  id: string;
  sales_order_id: string;
  article_sku: string;
  ordered_qty: number;
  picked_qty: number;
  rejected_qty: number;
  unit_price?: number;
  discrepancy: number; // read-only (DB GENERATED)
  notes?: string;
}

export interface SalesOrder {
  id: string;
  so_number: string;
  customer_id: string;
  status: SalesOrderStatus;
  expected_date?: string;
  notes?: string;
  created_by?: string;
  confirmed_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  picking_task_id?: string;
  created_at: string;
  updated_at: string;
  // embeds
  items?: SalesOrderItem[];
  customer?: { id: string; code: string; name: string };
}

export interface CreateSalesOrderRequest {
  customer_id: string;
  expected_date?: string;
  notes?: string;
  items?: Omit<SalesOrderItem, 'id' | 'sales_order_id' | 'picked_qty' | 'rejected_qty' | 'discrepancy'>[];
}

export interface UpdateSalesOrderRequest {
  customer_id?: string;
  expected_date?: string;
  notes?: string;
  items?: Omit<SalesOrderItem, 'id' | 'sales_order_id' | 'picked_qty' | 'rejected_qty' | 'discrepancy'>[];
}

export interface ConfirmSalesOrderResponse {
  sales_order: SalesOrder;
  picking_task_id: string;
}

export interface SalesOrderListFilters {
  status?: SalesOrderStatus;
  customer_id?: string;
  search?: string;
  page?: number;
  page_size?: number;
}
