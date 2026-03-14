/**
 * Suggested pick for outbound: location + lot + quantity, sorted by rotation (FIFO/FEFO) then lowest quantity first.
 */
export interface PickSuggestion {
	location: string;
	lot_id: string;
	lot_number: string;
	quantity: number;
	expiration_date?: string | null;
	lot_created_at: string;
}
