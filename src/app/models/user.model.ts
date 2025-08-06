export interface User {
	id: string;
	email: string;
	first_name: string;
	last_name: string;
	profile_image_url?: string | null;
	role: string;
	is_active: boolean;
	auth_provider: string;
	created_at: string;
	updated_at: string;
}
