/**
 * Presentation conversion from API (GET /presentation-conversions or /presentation-conversions/admin).
 * Rule: 1 unit of from_presentation_type = conversion_factor units of to_presentation_type.
 */
export interface PresentationConversion {
  id: string;
  from_presentation_type_id: string;
  to_presentation_type_id: string;
  conversion_factor: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePresentationConversionRequest {
  from_presentation_type_id: string;
  to_presentation_type_id: string;
  conversion_factor: number;
  is_active?: boolean;
}

export interface UpdatePresentationConversionRequest {
  conversion_factor: number;
  is_active?: boolean;
}
