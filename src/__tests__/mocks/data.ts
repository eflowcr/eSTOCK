/**
 * Shared mock data fixtures for eSTOCK tests.
 * Keep in sync with actual model interfaces.
 */

import { ApiResponse, Result, Envelope, StockAlert as DashboardStockAlert } from '@app/models';
import { Article } from '@app/models/article.model';
import { StockAlert, StockAlertResponse } from '@app/models/stock-alert.model';
import { AuthData } from '@app/models/auth.model';

// ─── Response helpers ────────────────────────────────────────────────────────

const MOCK_ENVELOPE: Envelope = {
  transaction_type: 'response',
  encrypted: false,
  encryption_type: 'none',
};

const MOCK_RESULT_OK: Result = {
  success: true,
  message: 'OK',
  endpoint_code: '200',
};

const MOCK_RESULT_FAIL: Result = {
  success: false,
  message: 'Error',
  endpoint_code: '500',
};

export function mockResponse<T>(data: T, success = true): ApiResponse<T> {
  return {
    envelope: MOCK_ENVELOPE,
    result: success ? MOCK_RESULT_OK : MOCK_RESULT_FAIL,
    data,
  };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const MOCK_AUTH_ADMIN: AuthData = {
  token: 'eyJhbGciOiJIUzI1NiJ9.admin',
  name: 'Admin',
  last_name: 'User',
  email: 'admin@estock.com',
  role: 'Admin',
  permissions: { all: true },
};

export const MOCK_AUTH_OPERATOR: AuthData = {
  token: 'eyJhbGciOiJIUzI1NiJ9.operator',
  name: 'Juan',
  last_name: 'Lopez',
  email: 'juan@estock.com',
  role: 'Operator',
  permissions: {
    inventory: { read: true, create: false, update: true, delete: false },
    articles: { read: true, create: false, update: false, delete: false },
    locations: { read: true, create: false, update: false, delete: false },
  },
};

export const MOCK_AUTH_NO_PERMS: AuthData = {
  token: 'eyJhbGciOiJIUzI1NiJ9.basic',
  name: 'Basic',
  last_name: 'User',
  email: 'basic@estock.com',
  role: 'Viewer',
  permissions: {},
};

// ─── Articles ─────────────────────────────────────────────────────────────────

export const MOCK_ARTICLE: Article = {
  id: 1,
  sku: 'SKU-001',
  name: 'Test Widget',
  description: 'A test article',
  presentation: 'Unidad',
  unit_price: 9.99,
  track_by_lot: false,
  track_by_serial: false,
  track_expiration: false,
  rotation_strategy: 'fifo',
  min_quantity: 5,
  max_quantity: 100,
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

export const MOCK_ARTICLE_LOT_TRACKED: Article = {
  ...MOCK_ARTICLE,
  id: 2,
  sku: 'SKU-002',
  name: 'Lot Tracked Article',
  track_by_lot: true,
  track_expiration: true,
  rotation_strategy: 'fefo',
};

export const MOCK_ARTICLES: Article[] = [MOCK_ARTICLE, MOCK_ARTICLE_LOT_TRACKED];

// ─── Stock Alerts ─────────────────────────────────────────────────────────────

/**
 * Dashboard-flavoured StockAlert (short shape from @app/models).
 * Used when testing service methods that return ApiResponse<DashboardStockAlert[]>.
 */
export const MOCK_DASHBOARD_ALERT_CRITICAL: DashboardStockAlert = {
  id: 'alert-uuid-001',
  sku: 'SKU-001',
  currentStock: 2,
  alertLevel: 'critical',
};

export const MOCK_DASHBOARD_ALERTS: DashboardStockAlert[] = [
  MOCK_DASHBOARD_ALERT_CRITICAL,
  { id: 'alert-uuid-002', sku: 'SKU-002', currentStock: 8, alertLevel: 'high' },
];

/**
 * Full StockAlert from stock-alert.model (snake_case).
 * Used in StockAlertResponse and component-level tests.
 */
export const MOCK_STOCK_ALERT_CRITICAL: StockAlert = {
  id: 'alert-uuid-001',
  sku: 'SKU-001',
  alert_type: 'low_stock',
  current_stock: 2,
  recommended_stock: 20,
  alert_level: 'critical',
  predicted_stock_out_days: 3,
  message: 'Critical: SKU-001 stock is very low',
  is_resolved: false,
  created_at: '2025-01-10T10:00:00Z',
};

export const MOCK_STOCK_ALERT_HIGH: StockAlert = {
  id: 'alert-uuid-002',
  sku: 'SKU-002',
  alert_type: 'low_stock',
  current_stock: 8,
  recommended_stock: 25,
  alert_level: 'high',
  message: 'High: SKU-002 stock is low',
  is_resolved: false,
  created_at: '2025-01-10T11:00:00Z',
};

export const MOCK_STOCK_ALERT_RESOLVED: StockAlert = {
  ...MOCK_STOCK_ALERT_CRITICAL,
  id: 'alert-uuid-003',
  is_resolved: true,
  resolved_at: '2025-01-11T09:00:00Z',
};

export const MOCK_ALERTS: StockAlert[] = [MOCK_STOCK_ALERT_CRITICAL, MOCK_STOCK_ALERT_HIGH];

export const MOCK_ALERT_RESPONSE: StockAlertResponse = {
  message: 'Analysis complete',
  alerts: MOCK_ALERTS,
  summary: { total: 2, critical: 1, high: 1, medium: 0, expiring: 0 },
};
