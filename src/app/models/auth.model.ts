// Authentication related models and interfaces

/** Permission shape from backend: { all: true } for admin or { [resource]: { read, create, update, delete } }. */
export type Permission =
  | { all: boolean }
  | { [resource: string]: { [action: string]: boolean } };

export interface User {
  user_id: string;
  user_name: string;
  email: string;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/** Stored auth payload; matches backend login response (token, role, permissions, etc.). */
export interface AuthData {
  token: string;
  name?: string;
  last_name?: string;
  email?: string;
  role?: string;
  permissions?: Permission;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Form validation interfaces
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// API Error interface
export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: any;
}

// JWT Token payload interface
export interface JwtPayload {
  sub: string; // user id
  email: string;
  role?: string;
  iat: number; // issued at
  exp: number; // expires at
}
