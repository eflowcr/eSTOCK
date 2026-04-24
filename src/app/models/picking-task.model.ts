import { LotEntry, LocationAllocation } from './lot-entry.model';

export type PickingTaskStatus =
  | 'open'
  | 'in_progress'
  | 'assigned'
  | 'completed'
  | 'completed_with_differences'
  | 'cancelled'
  | 'abandoned';

export interface PickingTask {
	id: string;
	task_id: string;
	outbound_number?: string; // Para compatibilidad con frontend
	order_number?: string; // Campo del backend
	created_by: string;
	assigned_to: string;
	status: PickingTaskStatus | string;
	priority: string;
	notes?: string | null;
	items: PickingTaskItem[];
	created_at: string;
	updated_at: string;
	completed_at?: string | null;
	// S2 extended fields
	customer_id?: string | null;
	customer?: { id: string; code: string; name: string };
}

export interface PickingTaskItem {
	sku: string;
	required_qty: number;               // A1: requerido
	picked_qty?: number;
	status?: string;
	allocations: LocationAllocation[];  // A1: reemplaza location: string
	lots?: LotEntry[];                  // lotes asignados al ítem (agregados across allocations)
	serial_numbers?: string[];
	// Aliases legacy (solo para leer tareas viejas del backend — Wave 7/F2 los elimina):
	location?: string;          // antes era el campo principal; ahora es fallback de lectura
	expectedQty?: number;
	lot_numbers?: string[];
	lotNumbers?: string[] | null;
	serialNumbers?: string[] | null;
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
	allocations: LocationAllocation[];  // requerido: al menos una allocation
	lots?: LotEntry[];
	serial_numbers?: string[];
}

export interface UpdatePickingTaskRequest extends Partial<CreatePickingTaskRequest> {
	id?: string;
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
