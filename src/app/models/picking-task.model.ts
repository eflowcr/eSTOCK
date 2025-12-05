export interface PickingTask {
	id: number;
	task_id: string;
	outbound_number?: string; 
	order_number?: string; 
	created_by: string;
	assigned_to: string;
	user_assignee_name?: string;
	user_creator_name?: string;
	status: string;
	priority: string;
	notes?: string | null;
	items: PickingTaskItem[];
	created_at: string;
	updated_at: string;
	completed_at?: string | null;
}

export interface PickingTaskItem {
	// Campos del backend
	outbound_id?: number;
	line_number?: number;
	sku: string;
	description?: string;
	location: string;
	expected_quantity?: number;
	picked_quantity?: number;
	status?: string;
	
	// Campos legacy/compatibilidad
	item_name?: string;
	required_qty?: number; 
	expectedQty?: number;
	picked_qty?: number;
	lot_numbers?: string[]; 
	lotNumbers?: string[] | null; 
	serialNumbers?: string[] | null; 
	
	// Lotes y series del backend
	lots?: PickingTaskLineLot[] | null;
	serials?: PickingTaskLineSerial[] | null;
}

export interface CreatePickingTaskRequest {
	outbound_number: string;
	assigned_to: string;
	priority: string;
	status: string;
	notes?: string;
	items: CreatePickingTaskItemRequest[];
}

export interface CreatePickingTaskItemRequest {
	sku: string;
	required_qty: number;
	location: string;
	lot_numbers?: string[];
	serial_numbers?: string[];
}

export interface UpdatePickingTaskRequest extends Partial<CreatePickingTaskRequest> {
	id?: number;
	status?: string;
}

export interface PickingTaskSearchParams {
	search?: string;
	task_id?: string;
	outbound_number?: string;
	status?: string;
	priority?: string;
	assigned_to?: string;
	created_by?: string;
	page?: number;
	limit?: number;
	sort_by?: string;
	sort_order?: 'asc' | 'desc';
}

export interface ProcessPickingTaskLine {
	location: string;
	quantity: number;
	series?: PickingTaskLineSerial[];
	lots?: PickingTaskLineLot[];
}

export interface PickingTaskLineLot {
	id?: number;
	inventory_lot: number;
	outbound_id: number;
	line_number: number;
	lot_number: string;
	sku: string;
	quantity: number;
	expiration_date?: string | null;
	created_at?: string;
	updated_at?: string;
	status?: string;
}

export interface PickingTaskLineSerial {
	id?: number;
	inventory_serial: number;
	outbound_id: number;
	line_number: number;
	serial_number: string;
	sku: string;
	status: string;
	created_at?: string;
	updated_at?: string;
}
