export interface ReceivingTask {
	id: number;
	task_id: string;
	inbound_number: string;
	order_number?: string; 
	created_by: string;
	assigned_to: string;
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
	expected_qty: number;
	expectedQty?: number; 
	received_qty: number;
	location: string;
	lot_numbers?: string[];
	serial_numbers?: string[];
	lotNumbers?: string[]; 
	serialNumbers?: string[]; 
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
