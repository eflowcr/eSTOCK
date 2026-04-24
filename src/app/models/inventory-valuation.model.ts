export interface ValuationBreakdownItem {
  id: string;
  label: string;        // sku | location_code | category name
  total_value: number;
  quantity: number;
}

export interface InventoryValuation {
  total_value: number;
  breakdown: ValuationBreakdownItem[];
  group_by: 'article' | 'location' | 'category';
}

export type ValuationGroupBy = 'article' | 'location' | 'category';
