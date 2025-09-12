// Modelos e interfaces de autenticación

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

export interface AuthData {
  token: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Interfaces de validación de formularios
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

// Interface de errores de API
export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: any;
}

// Interface de payload de token JWT
export interface JwtPayload {
  sub: string; // user id
  email: string;
  role?: string;
  iat: number; // issued at
  exp: number; // expires at
}
