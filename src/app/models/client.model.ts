export type ClientType = 'supplier' | 'customer' | 'both';

export interface Client {
  id: string;
  tenant_id: string;
  type: ClientType;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  notes?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientListFilters {
  type?: ClientType;
  is_active?: boolean;
  search?: string;
}
