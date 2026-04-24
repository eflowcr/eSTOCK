export interface LotEntry {
  lot_number: string;
  sku?: string;
  quantity: number;
  expiration_date?: string;   // "YYYY-MM-DD"
  manufactured_date?: string; // "YYYY-MM-DD" — para S2
  status?: 'pending' | 'picked' | 'received' | 'skipped' | string;
}

/**
 * A1: un ítem de picking se puede distribuir entre varias ubicaciones.
 * Ejemplo: pick 100 uds → 60 del estante-A + 40 del estante-B.
 *
 * expiration_date viene populada desde el endpoint de pick-suggestions
 * para evitar que el frontend haga queries extra por cada lote.
 * El campo es display-only — el backend no lo persiste en picking_tasks.
 */
export interface LocationAllocation {
  location: string;
  quantity: number;
  lot_number?: string;
  picked_qty?: number;
  status?: 'pending' | 'picked' | 'skipped' | string;
  expiration_date?: string;  // "YYYY-MM-DD" — display only (del pick-suggestions response)
}
