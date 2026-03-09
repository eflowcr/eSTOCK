import type { Permission } from '@app/models/auth.model';

/**
 * Normalizes permissions from API (object or JSON string).
 */
function normalizePermissions(permissions: Permission | null | undefined): Permission | null {
  if (permissions == null) return null;
  if (typeof permissions === 'string') {
    try {
      return JSON.parse(permissions) as Permission;
    } catch {
      return null;
    }
  }
  return permissions;
}

/**
 * Checks if the user has a specific permission.
 * Supports admin override (permissions.all === true) and resource-specific grants.
 */
export function hasPermission(
  resource: string,
  action: string,
  permissions: Permission | null | undefined
): boolean {
  const perms = normalizePermissions(permissions);
  if (!perms) return false;

  if (typeof perms === 'object' && 'all' in perms && perms.all === true) {
    return true;
  }

  const resourcePerms = (perms as Record<string, Record<string, boolean>>)[resource];
  if (resourcePerms && typeof resourcePerms === 'object') {
    return resourcePerms[action] === true;
  }

  return false;
}

/**
 * Checks if the user has any permission for a resource.
 */
export function hasResourceAccess(
  resource: string,
  permissions: Permission | null | undefined
): boolean {
  const perms = normalizePermissions(permissions);
  if (!perms) return false;
  if (typeof perms === 'object' && 'all' in perms && perms.all === true) {
    return true;
  }
  const resourcePerms = (perms as Record<string, Record<string, boolean>>)[resource];
  if (!resourcePerms || typeof resourcePerms !== 'object') return false;
  return Object.values(resourcePerms).some((v) => v === true);
}
