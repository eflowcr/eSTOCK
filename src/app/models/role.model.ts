/**
 * Role from GET /api/roles (matches backend RoleEntry).
 */
export interface Role {
	id: string;
	name: string;
	description: string;
	permissions?: unknown;
	is_active: boolean;
	created_at?: string;
	updated_at?: string;
}
