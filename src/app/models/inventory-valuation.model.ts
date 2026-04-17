export type ValuationGroupBy = 'article' | 'location' | 'category';

export interface ValuationBreakdownItem {
  key: string;    // sku or location_code or category_id
  label: string;  // human-readable
  value: number;
  qty: number;
}

export interface InventoryValuation {
  total_value: number;
  currency: string;
  group_by: ValuationGroupBy;
  breakdown: ValuationBreakdownItem[];
}
