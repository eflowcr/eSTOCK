import { AlertLevel } from './dashboard.model';

export interface StockAlert {
	id: number;
	sku: string;
	alert_type: string;
	current_stock: number;
	recommended_stock: number;
	alert_level: AlertLevel;
	predicted_stock_out_days?: number | null;
	message: string;
	is_resolved: boolean;
	lot_number?: string | null;
	expiration_date?: string | null;
	days_to_expiration?: number | null;
	created_at: string;
	resolved_at?: string | null;
}

export interface StockAlertSearchParams {
	search?: string;
	sku?: string;
	alert_type?: string;
	alert_level?: AlertLevel;
	is_resolved?: boolean;
	lot_number?: string;
	page?: number;
	limit?: number;
	sort_by?: string;
	sort_order?: 'asc' | 'desc';
}

export interface StockAlertSummary {
	total: number;
	critical: number;
	high: number;
	medium: number;
	expiring: number;
}

export interface StockAlertResponse {
	message: string;
	alerts: StockAlert[];
	summary: StockAlertSummary;
}
