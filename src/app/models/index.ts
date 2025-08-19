// API Response Models
export interface Envelope {
  transaction_type: string;
  encrypted: boolean;
  encryption_type: string;
}

export interface Result {
  success: boolean;
  message: string;
  endpoint_code: string;
}

export interface ApiResponse<T = any> {
  envelope: Envelope;
  result: Result;
  data: T;
}

export interface ActionResponse<T = any> extends ApiResponse<T> {}

// Fetch Models
export interface Fetch {
  URI?: string;
  API_Gateway: string;
  values?: Object;
}

export interface UploadFiles {
  URI?: string;
  API_Gateway: string;
  data?: FormData;
}

export type FetchResponseT<T> = Observable<string | T | {}>;

// Auth Models
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

export interface User {
  user_id: string;
  user_name: string;
  email: string;
  role: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Re-export auth models
export * from './auth.model';
export * from './inventory.model';
export * from './article.model';
export * from './dashboard.model';
export * from './receiving-task.model';
export * from './picking-task.model';
export * from './user.model';

// Import Observable for FetchResponseT
import { Observable } from 'rxjs';
