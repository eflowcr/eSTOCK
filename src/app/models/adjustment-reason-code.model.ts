/**
 * Adjustment reason code from API (GET /adjustment-reason-codes).
 * Direction determines add (inbound) or subtract (outbound).
 */
export interface AdjustmentReasonCode {
  id: string;
  code: string;
  name: string;
  direction: 'inbound' | 'outbound';
  is_system: boolean;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateAdjustmentReasonCodeRequest {
  code: string;
  name: string;
  direction: 'inbound' | 'outbound';
  display_order?: number;
  is_active?: boolean;
}

export interface UpdateAdjustmentReasonCodeRequest {
  code: string;
  name: string;
  direction: 'inbound' | 'outbound';
  display_order?: number;
  is_active?: boolean;
}
