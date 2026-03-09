import { Injectable } from '@angular/core';
import type { AuthData, Permission } from '@app/models/auth.model';
import { hasPermission as checkPermission } from '@app/utils/permissions';

@Injectable({
  providedIn: 'root',
})
export class AuthorizationService {
  private readonly STORAGE_KEY = 'auth_estock';

  private getAuthData(): AuthData | null {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as AuthData;
    } catch {
      return null;
    }
  }

  /** Returns the current user role from stored auth. */
  getCurrentUserRole(): string | null {
    const authData = this.getAuthData();
    return authData?.role ?? null;
  }

  /** Returns the full stored auth payload. */
  getCurrentUser(): AuthData | null {
    return this.getAuthData();
  }

  /** Returns permissions from stored auth (parsed if backend sent a string). */
  getPermissions(): Permission | null {
    const authData = this.getAuthData();
    const raw = authData?.permissions ?? null;
    if (raw == null) return null;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw) as Permission;
      } catch {
        return null;
      }
    }
    return raw;
  }

  /** True if user has the given resource/action (or admin/all). */
  hasPermission(resource: string, action: string): boolean {
    return checkPermission(resource, action, this.getPermissions());
  }

  /** True if user is admin (role name 'Admin' or permissions.all === true). */
  isAdmin(): boolean {
    const roleName = this.getCurrentUserRole();
    if (roleName != null && roleName.toLowerCase() === 'admin') return true;
    const perms = this.getPermissions();
    return typeof perms === 'object' && perms !== null && 'all' in perms && (perms as { all: boolean }).all === true;
  }

  /** True if token and auth data are present. */
  isAuthenticated(): boolean {
    const authData = this.getAuthData();
    return !!(authData?.token && authData);
  }
}
