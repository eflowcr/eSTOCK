export interface PickingTask {
	id: number;
	task_id: string;
	outbound_number: string;
	created_by: string;
	assigned_to: string;
	status: string;
	priority: string;
	notes?: string | null;
	items: PickingTaskItem[];
	created_at: string;
	updated_at: string;
	completed_at?: string | null;
}

export interface PickingTaskItem {
	sku: string;
	required_qty: number;
	picked_qty: number;
	location: string;
	lot_numbers?: string[];
	serial_numbers?: string[];
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
