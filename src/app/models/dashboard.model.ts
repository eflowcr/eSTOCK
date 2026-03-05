export interface DashboardStats {
  totalSkus: number;
  inventoryValue: number;
  lowStockCount: number;
  activeTasks: number;
}

export type AlertLevel = 'critical' | 'high' | 'medium' | 'low';

export interface StockAlert {
  id: string | number;
  sku: string;
  currentStock: number;
  alertLevel: AlertLevel;
}

/** KPI card with optional trend for dashboard overview */
export interface DashboardKpi {
  title: string;
  value: string;
  changePercent: number;
  changeLabel?: string;
  icon: string;
}

/** Stacked bar segment (e.g. Inbound / Outbound / Adjusted) */
export interface StackedBarSegment {
  label: string;
  /** Translation key suffix, e.g. 'inbound' for t('dashboard.inbound') */
  key: string;
  value: number;
  color: string;
}

export interface StackedBarPoint {
  period: string;
  total: number;
  segments: StackedBarSegment[];
}

/** Donut slice for distribution chart */
export interface DonutSlice {
  label: string;
  value: number;
  amount: string;
  color: string;
}

/** Row for "top articles" or integrations table */
export interface DashboardTableRow {
  id: string;
  name: string;
  type: string;
  ratePercent: number;
  amount: string;
}


