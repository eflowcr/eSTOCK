/**
 * Location type from API (GET /location-types or /location-types/admin).
 */
export interface LocationType {
  id: string;
  code: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateLocationTypeRequest {
  code: string;
  name: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateLocationTypeRequest {
  code: string;
  name: string;
  sort_order?: number;
  is_active?: boolean;
}
