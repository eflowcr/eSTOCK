/**
 * Role restrictions: admin-only routes and role checks.
 * Administration views are only for users with admin role or permissions.all.
 */

/** Routes that only admin can access (role === 'admin' or permissions.all === true). */
export const ADMIN_ONLY_ROUTES = [
  '/users',
  '/roles',
  '/location-types',
  '/presentation-types',
  '/admin-control-center',
  '/gamification',
];

/**
 * Returns true if the path is restricted to admin only.
 */
export function isAdminOnlyRoute(pathname: string): boolean {
  return ADMIN_ONLY_ROUTES.some((route) => pathname.startsWith(route));
}

/** Role name for full access (backend uses 'Admin'). */
export const ADMIN_ROLE_NAME = 'admin';

/**
 * Returns true if the role name is the admin role (case-insensitive).
 */
export function isAdminRole(roleName: string | null | undefined): boolean {
  if (!roleName) return false;
  return roleName.toLowerCase() === ADMIN_ROLE_NAME;
}
