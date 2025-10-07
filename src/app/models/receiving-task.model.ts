export interface ReceivingTask {
	id: number;
	task_id: string;
	inbound_number: string;
	order_number?: string; 
	created_by: string;
	assigned_to: string;
	user_assignee_name?: string;
	user_creator_name?: string;
	status: string;
	priority: string;
	notes?: string | null;
	items: ReceivingTaskItem[];
	created_at: string;
	updated_at: string;
	completed_at?: string | null;
}

export interface ReceivingTaskItem {
	sku: string;
	item_name?: string;
	expected_qty: number;
	expectedQty?: number; 
	received_qty: number;
	location: string;
	status?: string;
	lot_numbers?: string[];
	serial_numbers?: string[];
	lotNumbers?: string[]; 
	serialNumbers?: string[];
	lots?: Array<{
		lot_number: string;
		sku: string;
		quantity: number;
		expiration_date?: string | null;
	}>;
	serials?: Array<{
		id?: number;
		serial_number: string;
		sku: string;
		status: string;
		created_at?: string;
		updated_at?: string;
	}>;
}

export interface CreateReceivingTaskRequest {
	inbound_number: string;
	assigned_to: string;
	priority: string;
	status: string; 
	notes?: string;
	items: CreateReceivingTaskItemRequest[];
}

export interface CreateReceivingTaskItemRequest {
	sku: string;
	expected_qty: number;
	location: string;
	lot_numbers?: string[];
	serial_numbers?: string[];
}

export interface UpdateReceivingTaskRequest extends Partial<CreateReceivingTaskRequest> {
	id?: number;
	status?: string;
}

export interface ReceivingTaskSearchParams {
	search?: string;
	task_id?: string;
	inbound_number?: string;
	status?: string;
	priority?: string;
	assigned_to?: string;
	created_by?: string;
	page?: number;
	limit?: number;
	sort_by?: string;
	sort_order?: 'asc' | 'desc';
}

export interface CreateLotRequest {
	lot_number: string;
	sku: string;
	quantity: number;
	received_quantity: number;
	expiration_date?: string | null;
	status?: string | null;
}

export interface Serial {
	id?: number;
	serial_number: string;
	sku: string;
	status: string;
	created_at?: string;
	updated_at?: string;
}

export interface ReceivingTaskItemRequest {
	sku: string;
	expected_qty: number;
	location: string;
	lots?: CreateLotRequest[];
	serials?: Serial[];
	status?: string | null;
	received_qty?: number | null;
}
