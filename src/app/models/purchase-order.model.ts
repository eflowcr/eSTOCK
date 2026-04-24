export type PurchaseOrderStatus = 'draft' | 'submitted' | 'partial' | 'completed' | 'cancelled';

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  article_sku: string;
  expected_qty: number;
  received_qty: number;
  rejected_qty: number;
  unit_cost?: number;
  discrepancy: number; // read-only (DB GENERATED)
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  status: PurchaseOrderStatus;
  expected_date?: string;
  notes?: string;
  created_by?: string;
  submitted_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  receiving_task_id?: string;
  created_at: string;
  updated_at: string;
  // embeds
  items?: PurchaseOrderItem[];
  supplier?: { id: string; code: string; name: string };
}

export interface CreatePurchaseOrderRequest {
  supplier_id: string;
  expected_date?: string;
  notes?: string;
  items?: Omit<PurchaseOrderItem, 'id' | 'purchase_order_id' | 'received_qty' | 'rejected_qty' | 'discrepancy'>[];
}

export interface UpdatePurchaseOrderRequest {
  supplier_id?: string;
  expected_date?: string;
  notes?: string;
  items?: Omit<PurchaseOrderItem, 'id' | 'purchase_order_id' | 'received_qty' | 'rejected_qty' | 'discrepancy'>[];
}

export interface SubmitPurchaseOrderResponse {
  purchase_order: PurchaseOrder;
  receiving_task_id: string;
}

export interface PurchaseOrderListFilters {
  status?: PurchaseOrderStatus;
  supplier_id?: string;
  search?: string;
  page?: number;
  page_size?: number;
}
