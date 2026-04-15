/**
 * Suggested pick for outbound: location + lot + quantity, sorted by rotation (FIFO/FEFO) then lowest quantity first.
 * @deprecated H3 rewrite returns PickSuggestionResponse instead. Kept for legacy fallback handling.
 */
export interface PickSuggestion {
	location: string;
	lot_id: string;
	lot_number: string;
	quantity: number;
	expiration_date?: string | null;
	lot_created_at: string;
}

/**
 * One allocation within a PickSuggestionResponse — maps to LocationAllocation shape.
 * expiration_date is display-only; not sent back to backend.
 */
export interface AllocationSuggestion {
	location: string;
	quantity: number;
	lot_number?: string;
	expiration_date?: string;
}

/**
 * Response from GET /inventory/pick-suggestions/:sku?qty=N (H3 FEFO rewrite).
 * allocations are pre-sorted FEFO across all locations.
 */
export interface PickSuggestionResponse {
	allocations: AllocationSuggestion[];
	total_found: number;
	requested: number;
	sufficient: boolean;
}
