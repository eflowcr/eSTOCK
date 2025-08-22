import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { PickingTask, CreatePickingTaskRequest, UpdatePickingTaskRequest, PickingTaskSearchParams } from '@app/models/picking-task.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/picking-tasks';
export const PICKING_TASK_URL = returnCompleteURI({
	URI: environment.API.BASE,
	API_Gateway: GATEWAY,
});

@Injectable({
	providedIn: 'root',
})
export class PickingTaskService {
	constructor(private fetchService: FetchService) {}

	/**
	 * @description Get all picking tasks
	 * @returns Promise<ApiResponse<PickingTask[]>>
	 */
	async getAll(): Promise<ApiResponse<PickingTask[]>> {
		return await this.fetchService.get<ApiResponse<PickingTask[]>>({
			API_Gateway: `${PICKING_TASK_URL}/`,
		});
	}

	/**
	 * @description Get picking task by ID
	 * @param id Picking task ID
	 * @returns Promise<ApiResponse<PickingTask>>
	 */
	async getById(id: number): Promise<ApiResponse<PickingTask>> {
		return await this.fetchService.get<ApiResponse<PickingTask>>({
			API_Gateway: `${PICKING_TASK_URL}/${id}`,
		});
	}

	/**
	 * @description Create new picking task
	 * @param task Picking task data
	 * @returns Promise<ApiResponse<any>>
	 */
	async create(task: CreatePickingTaskRequest): Promise<ApiResponse<any>> {
		return await this.fetchService.post<ApiResponse<any>>({
			API_Gateway: `${PICKING_TASK_URL}/`,
			values: task,
		});
	}

	/**
	 * @description Update picking task by ID
	 * @param id Picking task ID
	 * @param data Partial picking task data
	 * @returns Promise<ApiResponse<any>>
	 */
	async update(id: number, data: UpdatePickingTaskRequest): Promise<ApiResponse<any>> {
		return await this.fetchService.put<ApiResponse<any>>({
			API_Gateway: `${PICKING_TASK_URL}/${id}`,
			values: data,
		});
	}

	/**
	 * @description Search picking tasks with filters
	 * @param params Search parameters
	 * @returns Promise<ApiResponse<PickingTask[]>>
	 */
	async search(params: PickingTaskSearchParams): Promise<ApiResponse<PickingTask[]>> {
		const searchParams = new URLSearchParams();
		
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null && value !== '') {
				searchParams.append(key, value.toString());
			}
		});

		const queryString = searchParams.toString();
		const url = queryString ? `${PICKING_TASK_URL}/?${queryString}` : `${PICKING_TASK_URL}/`;

		return await this.fetchService.get<ApiResponse<PickingTask[]>>({
			API_Gateway: url,
		});
	}

	/**
	 * @description Import picking tasks from file
	 * @param file File to import
	 * @returns Promise<ApiResponse<any>>
	 */
	async import(file: File): Promise<ApiResponse<any>> {
		const formData = new FormData();
		formData.append('file', file);

		return await this.fetchService.post<ApiResponse<any>>({
			API_Gateway: `${PICKING_TASK_URL}/import`,
			values: formData,
		});
	}

	/**
	 * @description Export picking tasks to Excel
	 * @returns Promise<ApiResponse<any>>
	 */
	async export(): Promise<ApiResponse<any>> {
		return await this.fetchService.get<ApiResponse<any>>({
			API_Gateway: `${PICKING_TASK_URL}/export`,
		});
	}
}
