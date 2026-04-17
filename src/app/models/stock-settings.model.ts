export type ValuationMethod = 'avco' | 'fifo';
export type PickBatchBasedOn = 'fefo' | 'fifo' | 'lifo';
export type PartialDeliveryPolicy = 'immediate' | 'when_all_ready';

export interface StockSettings {
  tenant_id: string;
  valuation_method: ValuationMethod;
  pick_batch_based_on: PickBatchBasedOn;
  over_receipt_allowance_pct: number;
  over_delivery_allowance_pct: number;
  over_picking_allowance_pct: number;
  auto_reserve_stock: boolean;
  allow_partial_reservation: boolean;
  expiry_alert_days: number;
  auto_create_material_request: boolean;
  partial_delivery_policy: PartialDeliveryPolicy;
  updated_at: string;
}
