export type TenantStatus = 'trial' | 'active' | 'past_due' | 'cancelled' | 'suspended';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  status: TenantStatus;
  signup_at: string;
  trial_started_at: string;
  trial_ends_at: string;
  is_active: boolean;
  metadata?: Record<string, any>;
}

export interface TenantSignupRequest {
  name: string;
  slug: string;
  email: string;
  password: string;
}

export interface TenantUpdateRequest {
  name?: string;
  email?: string;
  metadata?: Record<string, any>;
}
