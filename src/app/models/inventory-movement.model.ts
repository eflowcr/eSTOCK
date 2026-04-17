export type MovementType = 'INBOUND' | 'OUTBOUND' | 'ADJUSTMENT' | 'TRANSFER' | 'REJECTED';

export interface InventoryMovement {
  id: string;
  sku: string;
  location_code: string;
  quantity: number;
  movement_type: MovementType;
  reference_type?: string | null;   // receiving_task|picking_task|adjustment|transfer
  reference_id?: string | null;
  lot_id?: string | null;
  unit_cost?: number | null;
  before_qty?: number | null;
  after_qty?: number | null;
  user_id?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface InventoryMovementFilters {
  sku?: string;
  location_code?: string;
  movement_type?: MovementType;
  reference_type?: string;
  from?: string;   // ISO date
  to?: string;     // ISO date
  lot_id?: string;
  page?: number;
  limit?: number;
}

export interface MonthlyMovements {
  month: string;     // YYYY-MM
  receiving: number;
  picking: number;
  adjustment: number;
}
