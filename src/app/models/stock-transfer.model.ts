/**
 * Stock transfer from API (GET /stock-transfers). WMS-style transfer order from one location to another.
 */
export interface StockTransfer {
  id: string;
  transfer_number: string;
  from_location_id: string;
  to_location_id: string;
  status: string;
  created_by: string;
  assigned_to?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
}

export interface StockTransferLine {
  id: string;
  stock_transfer_id: string;
  sku: string;
  quantity: number;
  presentation?: string | null;
  line_status: string;
  created_at?: string;
}

export interface StockTransferLineInput {
  sku: string;
  quantity: number;
  presentation?: string | null;
}

export interface CreateStockTransferRequest {
  from_location_id: string;
  to_location_id: string;
  assigned_to?: string | null;
  notes?: string | null;
  lines: StockTransferLineInput[];
}

export interface UpdateStockTransferRequest {
  from_location_id: string;
  to_location_id: string;
  status: string;
  assigned_to?: string | null;
  notes?: string | null;
}

export interface UpdateStockTransferLineRequest {
  quantity: number;
  presentation?: string | null;
  line_status?: string;
}
