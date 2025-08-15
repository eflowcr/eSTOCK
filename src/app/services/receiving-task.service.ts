import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { ReceivingTask, CreateReceivingTaskRequest, UpdateReceivingTaskRequest, ReceivingTaskSearchParams } from '@app/models/receiving-task.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/receiving-tasks';
export const RECEIVING_TASK_URL = returnCompleteURI({
	URI: environment.API.BASE,
	API_Gateway: GATEWAY,
});

@Injectable({
	providedIn: 'root',
})
export class ReceivingTaskService {
	constructor(private fetchService: FetchService) {}

	/**
	 * @description Get all receiving tasks
	 * @returns Promise<ApiResponse<ReceivingTask[]>>
	 */
	async getAll(): Promise<ApiResponse<ReceivingTask[]>> {
		return await this.fetchService.get<ApiResponse<ReceivingTask[]>>({
			API_Gateway: `${RECEIVING_TASK_URL}/`,
		});
	}

	/**
	 * @description Get receiving task by ID
	 * @param id Receiving task ID
	 * @returns Promise<ApiResponse<ReceivingTask>>
	 */
	async getById(id: number): Promise<ApiResponse<ReceivingTask>> {
		return await this.fetchService.get<ApiResponse<ReceivingTask>>({
			API_Gateway: `${RECEIVING_TASK_URL}/${id}`,
		});
	}

	/**
	 * @description Create new receiving task
	 * @param task Receiving task data
	 * @returns Promise<ApiResponse<any>>
	 */
	async create(task: CreateReceivingTaskRequest): Promise<ApiResponse<any>> {
		return await this.fetchService.post<ApiResponse<any>>({
			API_Gateway: `${RECEIVING_TASK_URL}/`,
			values: task,
		});
	}

	/**
	 * @description Update receiving task by ID
	 * @param id Receiving task ID
	 * @param data Partial receiving task data
	 * @returns Promise<ApiResponse<any>>
	 */
	async update(id: number, data: UpdateReceivingTaskRequest): Promise<ApiResponse<any>> {
		return await this.fetchService.put<ApiResponse<any>>({
			API_Gateway: `${RECEIVING_TASK_URL}/${id}`,
			values: data,
		});
	}

	/**
	 * @description Search receiving tasks with filters
	 * @param params Search parameters
	 * @returns Promise<ApiResponse<ReceivingTask[]>>
	 */
	async search(params: ReceivingTaskSearchParams): Promise<ApiResponse<ReceivingTask[]>> {
		const searchParams = new URLSearchParams();
		
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null && value !== '') {
				searchParams.append(key, value.toString());
			}
		});

		const queryString = searchParams.toString();
		const url = queryString ? `${RECEIVING_TASK_URL}/?${queryString}` : `${RECEIVING_TASK_URL}/`;

		return await this.fetchService.get<ApiResponse<ReceivingTask[]>>({
			API_Gateway: url,
		});
	}

	/**
	 * @description Import receiving tasks from file
	 * @param file File to import
	 * @returns Promise<ApiResponse<any>>
	 */
	async import(file: File): Promise<ApiResponse<any>> {
		const formData = new FormData();
		formData.append('file', file);

		return await this.fetchService.post<ApiResponse<any>>({
			API_Gateway: `${RECEIVING_TASK_URL}/import`,
			values: formData,
		});
	}
}
