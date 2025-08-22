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


