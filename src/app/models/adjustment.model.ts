export interface Adjustment {
  id: number;
  sku: string;
  location: string;
  previous_quantity: number;
  adjustment_quantity: number;
  new_quantity: number;
  reason: string;
  notes?: string;
  user_id: string;
  created_at: Date;
}

export interface AdjustmentFormData {
  sku: string;
  location: string;
  adjustment_quantity: number;
  reason: string;
  notes: string;              
  lots?: AdjustmentLot[];       // Optional lots
  serials?: string[];           // Optional serials
}

export interface AdjustmentLot {
  lotNumber: string;           
  quantity: number;
  expirationDate?: string | null;  
}