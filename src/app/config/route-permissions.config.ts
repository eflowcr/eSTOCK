/**
 * Route permission configuration.
 * Maps routes to required resource/action for access control.
 */

export type PermissionAction = 'read' | 'create' | 'update' | 'delete';

export interface RoutePermission {
  resource: string;
  action: PermissionAction;
}

/**
 * Routes that require a specific permission.
 * Operational routes (receiving, picking, adjustments, alerts) use "inventory" so
 * operator and viewer (with inventory read) can access them without extra role keys.
 */
export const ROUTE_PERMISSIONS: Record<string, RoutePermission> = {
  '/articles': { resource: 'articles', action: 'read' },
  '/inventory': { resource: 'inventory', action: 'read' },
  '/locations': { resource: 'locations', action: 'read' },
  '/receiving-tasks': { resource: 'inventory', action: 'read' },
  '/picking-tasks': { resource: 'inventory', action: 'read' },
  '/stock-adjustments': { resource: 'inventory', action: 'update' },
  '/stock-alerts': { resource: 'inventory', action: 'read' },
  '/barcode-generator': { resource: 'articles', action: 'read' },
  '/gamification': { resource: 'gamification', action: 'read' },
  '/admin-control-center': { resource: 'admin_control', action: 'read' },
  '/users': { resource: 'users', action: 'read' },
  '/roles': { resource: 'roles', action: 'read' },
};

/**
 * Returns the required permission for a route.
 */
export function getRoutePermission(pathname: string): RoutePermission | null {
  const normalized = pathname.replace(/\/$/, '') || '/';
  if (ROUTE_PERMISSIONS[normalized]) {
    return ROUTE_PERMISSIONS[normalized];
  }
  for (const [route, permission] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname.startsWith(route)) {
      return permission;
    }
  }
  return null;
}

/**
 * Whether the route requires a permission check (not just auth).
 */
export function routeRequiresPermission(pathname: string): boolean {
  return getRoutePermission(pathname) !== null;
}
