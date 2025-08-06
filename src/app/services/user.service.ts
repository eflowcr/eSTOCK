import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { User } from '@app/models/user.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/users';
export const USER_URL = returnCompleteURI({
	URI: environment.API.BASE,
	API_Gateway: GATEWAY,
});

@Injectable({
	providedIn: 'root',
})
export class UserService {
	constructor(private fetchService: FetchService) {}

	/**
	 * @description Get all users
	 * @returns Promise<ApiResponse<User[]>>
	 */
	async getAll(): Promise<ApiResponse<User[]>> {
		return await this.fetchService.get<ApiResponse<User[]>>({
			API_Gateway: `${USER_URL}`,
		});
	}

	/**
	 * @description Get user by ID
	 * @param id User ID
	 * @returns Promise<ApiResponse<User>>
	 */
	async getById(id: string): Promise<ApiResponse<User>> {
		return await this.fetchService.get<ApiResponse<User>>({
			API_Gateway: `${USER_URL}/${id}`,
		});
	}

	/**
	 * @description Create new user
	 * @param user User data
	 * @returns Promise<ApiResponse<any>>
	 */
	async create(user: Partial<User>): Promise<ApiResponse<any>> {
		return await this.fetchService.post<ApiResponse<any>>({
			API_Gateway: `${USER_URL}`,
			values: user,
		});
	}

	/**
	 * @description Update user by ID
	 * @param id User ID
	 * @param data Partial user data
	 * @returns Promise<ApiResponse<any>>
	 */
	async update(id: string, data: Partial<User>): Promise<ApiResponse<any>> {
		return await this.fetchService.put<ApiResponse<any>>({
			API_Gateway: `${USER_URL}/${id}`,
			values: data,
		});
	}

	/**
	 * @description Delete user by ID
	 * @param id User ID
	 * @returns Promise<ApiResponse<any>>
	 */
	async delete(id: string): Promise<ApiResponse<any>> {
		return await this.fetchService.delete<ApiResponse<any>>({
			API_Gateway: `${USER_URL}/${id}`,
		});
	}

	/**
	 * @description Update user password
	 * @param id User ID
	 * @param newPassword New password
	 * @returns Promise<ApiResponse<any>>
	 */
	async updatePassword(id: string, newPassword: string): Promise<ApiResponse<any>> {
		return await this.fetchService.post<ApiResponse<any>>({
			API_Gateway: `${USER_URL}/${id}/update-password`,
			values: { newPassword },
		});
	}

	/**
	 * @description Import users from file
	 * @param file File to import
	 * @returns Promise<ApiResponse<any>>
	 */
	async importFile(file: File): Promise<ApiResponse<any>> {
		const formData = new FormData();
		formData.append('file', file);

		return await this.fetchService.post<ApiResponse<any>>({
			API_Gateway: `${USER_URL}/import`,
			values: formData,
		});
	}
    

	/**
	 * @description Export users to file
	 * @param format Export format (csv or xlsx)
	 * @returns Promise<Blob>
	 */
	async exportFile(format: string = 'xlsx'): Promise<Blob> {
		return await this.fetchService.download({
			API_Gateway: `${USER_URL}/export?format=${format}`,
		});
	}
}
