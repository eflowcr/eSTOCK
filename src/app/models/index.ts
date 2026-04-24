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

/** Matches backend APIResponse: all responses use this envelope (success and error). */
export interface ApiResponse<T = any> {
  envelope: Envelope;
  result: Result;
  data: T;
}

export interface ActionResponse<T = any> extends ApiResponse<T> {}

/** Error payload received in catch blocks: backend body (envelope + result + data) + HTTP status from handleError. */
export type ApiErrorPayload = ApiResponse & { status?: number };

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
export * from './lot-entry.model';
export * from './inventory.model';
export * from './article.model';
export * from './dashboard.model';
export * from './receiving-task.model';
export * from './picking-task.model';
export * from './user.model';
export * from './role.model';
export * from './barcode.model';
export * from './gamification.model';
// S2 models
export * from './client.model';
export * from './category.model';
export * from './notification.model';
export * from './stock-settings.model';
export * from './inventory-valuation.model';
export * from './lot-trace.model';
export * from './adjustment.model';
// Note: lot.model.ts intentionally NOT re-exported here — name collision with
// inventory.model.ts's inline Lot/CreateLotRequest. Import lot.model directly.
// S3 models
export * from './article-supplier.model';
export * from './purchase-order.model';
export * from './sales-order.model';
export * from './delivery-note.model';
export * from './backorder.model';
export * from './tenant.model';

// Import Observable for FetchResponseT
import { Observable } from 'rxjs';
