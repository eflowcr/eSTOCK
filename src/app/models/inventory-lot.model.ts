export interface InventoryLot {
  id: string;
  lot_id: string;
  lot_number: string;
  sku: string;
  location: string;
  qty: number;
  expiration_date?: string | null;
  best_before_date?: string | null;
  manufactured_at?: string | null;
  lot_notes?: string | null;
  status: string;
}

export interface InventoryLotSearchParams {
  sku?: string;
  location?: string;
  status?: string;
  expiry_before?: string;
  expiry_after?: string;
  page?: number;
  limit?: number;
}
