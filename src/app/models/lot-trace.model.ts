export type MovementType =
  | 'INBOUND' | 'OUTBOUND' | 'REJECTED'
  | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT';

export interface LotTraceOrigin {
  receiving_task_id: string;
  supplier?: { id: string; code: string; name: string };
  received_at: string;
}

export interface LotTraceStockByLocation {
  location: string;
  qty: number;
}

export interface LotTraceResponse {
  lot: {
    id: string;
    lot_number: string;
    sku: string;
    expiration_date?: string;
    manufactured_at?: string;
    best_before_date?: string;
    status: string;
  };
  origin: LotTraceOrigin | null;
  movements: {
    id: string;
    type: MovementType;
    sku: string;
    location?: string;
    quantity: number;
    before_qty?: number;
    after_qty?: number;
    unit_cost?: number;
    reference_type?: string;
    reference_id?: string;
    lot_id?: string;
    user_id?: string;
    created_at: string;
  }[];
  current_stock: {
    total_qty: number;
    by_location: LotTraceStockByLocation[];
  };
}
