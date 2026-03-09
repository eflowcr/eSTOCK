import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { Role } from '@app/models/role.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/roles';
const ROLES_URL = returnCompleteURI({
	URI: environment.API.BASE,
	API_Gateway: GATEWAY,
});

@Injectable({
	providedIn: 'root',
})
export class RolesService {
	constructor(private fetchService: FetchService) {}

	/**
	 * Get all roles (for dropdowns and role management).
	 */
	async getList(): Promise<ApiResponse<Role[]>> {
		return await this.fetchService.get<ApiResponse<Role[]>>({
			API_Gateway: `${ROLES_URL}/`,
		});
	}

	/**
	 * Get one role by id (or name).
	 */
	async getById(id: string): Promise<ApiResponse<Role>> {
		return await this.fetchService.get<ApiResponse<Role>>({
			API_Gateway: `${ROLES_URL}/${encodeURIComponent(id)}`,
		});
	}

	/**
	 * Update role permissions. Body: { permissions: { [resource]: { read?, create?, update?, delete? } } } or { all: true }.
	 */
	async updatePermissions(id: string, permissions: Record<string, unknown>): Promise<ApiResponse<Role>> {
		return await this.fetchService.put<ApiResponse<Role>>({
			API_Gateway: `${ROLES_URL}/${encodeURIComponent(id)}`,
			values: { permissions },
		});
	}
}
