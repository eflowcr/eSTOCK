import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { PickingTask, CreatePickingTaskRequest, UpdatePickingTaskRequest, PickingTaskSearchParams, ProcessPickingTaskLine } from '@app/models/picking-task.model';
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

	/**
	 * @description Complete full picking task
	 * @param id Picking task ID
	 * @returns Promise<ApiResponse<any>>
	 */
	async completeFullTask(id: number): Promise<ApiResponse<any>> {
		return await this.fetchService.patch<ApiResponse<any>>({
			API_Gateway: `${PICKING_TASK_URL}/complete-full-task/${id}`,
		});
	}

	/**
	 * @description Complete a specific picking line item within a task
	 * @param outboundNumber Outbound number identifier
	 * @param lineNumber Line number to complete
	 * @param lineData Line data with location, quantity, series and lots
	 * @returns Promise<ApiResponse<any>>
	 */
	async completePickingLine(
		outboundNumber: number,
		lineNumber: number,
		lineData: ProcessPickingTaskLine
	): Promise<ApiResponse<any>> {
		// Use custom method to handle malformed response (two concatenated JSONs)
		return await this.completePickingLineCustom(outboundNumber, lineNumber, lineData);
	}

	/**
	 * @description Custom method to handle malformed response from complete-picking-line endpoint
	 * @param outboundNumber Outbound number identifier
	 * @param lineNumber Line number to complete
	 * @param lineData Line data with location, quantity, series and lots
	 * @returns Promise<ApiResponse<any>>
	 */
	private async completePickingLineCustom(
		outboundNumber: number,
		lineNumber: number,
		lineData: ProcessPickingTaskLine
	): Promise<ApiResponse<any>> {
		const url = `${PICKING_TASK_URL}/complete-picking-line/${outboundNumber}/${lineNumber}`;
		
		try {
			// Make request expecting text response instead of JSON
			const response = await this.fetchService.patchText({
				API_Gateway: url,
				values: lineData,
			});

			// Parse the response which contains two concatenated JSONs
			return this.parseDoubleJsonResponse(response);
		} catch (error) {
			console.error('Error in completePickingLineCustom:', error);
			throw error;
		}
	}

	/**
	 * @description Parse response containing two concatenated JSON objects
	 * @param responseText Raw text response
	 * @returns ApiResponse<any>
	 */
	private parseDoubleJsonResponse(responseText: string): ApiResponse<any> {
		try {
			// Split the response by looking for "}{"
			const jsonParts = responseText.split('}{');
			
			if (jsonParts.length === 2) {
				// Reconstruct the two JSON objects
				const firstJson = jsonParts[0] + '}';
				const secondJson = '{' + jsonParts[1];
				
				try {
					const firstResponse = JSON.parse(firstJson);
					const secondResponse = JSON.parse(secondJson);
					
					// Return the second response (which seems to be the final one)
					// or the first one if it has success: false
					if (!firstResponse.result.success) {
						return firstResponse;
					} else if (!secondResponse.result.success) {
						return secondResponse;
					} else {
						// Both are success: true, return the second one
						return secondResponse;
					}
				} catch (parseError) {
					console.error('Error parsing individual JSON parts:', parseError);
					throw new Error('Invalid JSON response format');
				}
			} else {
				// Try to parse as single JSON
				return JSON.parse(responseText);
			}
		} catch (error) {
			console.error('Error parsing double JSON response:', error);
			throw new Error('Failed to parse response');
		}
	}
}
