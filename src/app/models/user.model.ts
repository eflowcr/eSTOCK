import type { Role } from './role.model';

export interface User {
	id: string;
	email: string;
	first_name: string;
	last_name: string;
	profile_image_url?: string | null;
	/** FK to roles.id; used for create/update. */
	role_id: string;
	/** Nested role from API (when backend Preloads). Use for display name. */
	role?: Role | null;
	is_active: boolean;
	auth_provider: string;
	created_at: string;
	updated_at: string;
}

/** Role display label: role name or role_id. */
export function getRoleDisplayName(user: User): string {
	return user.role?.name ?? user.role_id ?? '';
}
