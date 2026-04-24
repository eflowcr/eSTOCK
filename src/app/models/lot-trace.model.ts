// Re-export canonical types — single source of truth for movement shape.
// The backend endpoint GET /lots/:id/trace returns movement_type (not type).
import type { InventoryMovement, MovementType } from './inventory-movement.model';
export type { MovementType, InventoryMovement };

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
  movements: InventoryMovement[];
  current_stock: {
    total_qty: number;
    by_location: LotTraceStockByLocation[];
  };
}
