/**
 * Presentation type from API (GET /presentation-types or /presentation-types/admin).
 */
export interface PresentationType {
  id: string;
  code: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePresentationTypeRequest {
  code: string;
  name: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdatePresentationTypeRequest {
  code: string;
  name: string;
  sort_order?: number;
  is_active?: boolean;
}
