import { TestBed } from '@angular/core/testing';
import { AuthorizationService } from './authorization.service';
import { MOCK_AUTH_ADMIN, MOCK_AUTH_OPERATOR, MOCK_AUTH_NO_PERMS } from '../../../__tests__/mocks/data';
import { AuthData } from '@app/models/auth.model';

const STORAGE_KEY = 'auth_estock';

function setAuth(data: AuthData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function clearAuth(): void {
  localStorage.removeItem(STORAGE_KEY);
}

describe('AuthorizationService', () => {
  let service: AuthorizationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthorizationService);
    clearAuth();
  });

  afterEach(() => {
    clearAuth();
  });

  // ─── isAuthenticated ────────────────────────────────────────────────────────

  describe('isAuthenticated()', () => {
    it('returns false when localStorage is empty', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('returns true when a token is present', () => {
      setAuth(MOCK_AUTH_ADMIN);
      expect(service.isAuthenticated()).toBe(true);
    });

    it('returns false when token is an empty string', () => {
      setAuth({ ...MOCK_AUTH_ADMIN, token: '' });
      expect(service.isAuthenticated()).toBe(false);
    });

    it('returns false when localStorage contains malformed JSON', () => {
      localStorage.setItem(STORAGE_KEY, '{not-valid-json}');
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  // ─── isAdmin ───────────────────────────────────────────────────────────────

  describe('isAdmin()', () => {
    it('returns true when role is Admin', () => {
      setAuth(MOCK_AUTH_ADMIN);
      expect(service.isAdmin()).toBe(true);
    });

    it('is case-insensitive for admin role check', () => {
      setAuth({ ...MOCK_AUTH_ADMIN, role: 'admin' });
      expect(service.isAdmin()).toBe(true);

      setAuth({ ...MOCK_AUTH_ADMIN, role: 'ADMIN' });
      expect(service.isAdmin()).toBe(true);
    });

    it('returns true when permissions.all is true regardless of role', () => {
      setAuth({ ...MOCK_AUTH_OPERATOR, permissions: { all: true } });
      expect(service.isAdmin()).toBe(true);
    });

    it('returns false for Operator role with resource-level permissions', () => {
      setAuth(MOCK_AUTH_OPERATOR);
      expect(service.isAdmin()).toBe(false);
    });

    it('returns false when no auth data in localStorage', () => {
      expect(service.isAdmin()).toBe(false);
    });
  });

  // ─── hasPermission ─────────────────────────────────────────────────────────

  describe('hasPermission()', () => {
    it('returns false when no auth data', () => {
      expect(service.hasPermission('articles', 'read')).toBe(false);
    });

    it('returns true when resource+action is granted', () => {
      setAuth(MOCK_AUTH_OPERATOR);
      expect(service.hasPermission('articles', 'read')).toBe(true);
    });

    it('returns false when action is not granted for resource', () => {
      setAuth(MOCK_AUTH_OPERATOR);
      expect(service.hasPermission('articles', 'delete')).toBe(false);
    });

    it('returns true for admin on any permission', () => {
      setAuth(MOCK_AUTH_ADMIN);
      expect(service.hasPermission('articles', 'delete')).toBe(true);
      expect(service.hasPermission('users', 'create')).toBe(true);
    });

    it('returns false when permissions object is empty', () => {
      setAuth(MOCK_AUTH_NO_PERMS);
      expect(service.hasPermission('inventory', 'read')).toBe(false);
    });
  });

  // ─── getCurrentUser ────────────────────────────────────────────────────────

  describe('getCurrentUser()', () => {
    it('returns null when no auth data', () => {
      expect(service.getCurrentUser()).toBeNull();
    });

    it('returns the stored auth payload', () => {
      setAuth(MOCK_AUTH_OPERATOR);
      const user = service.getCurrentUser();
      expect(user).not.toBeNull();
      expect(user?.email).toBe(MOCK_AUTH_OPERATOR.email);
      expect(user?.role).toBe(MOCK_AUTH_OPERATOR.role);
    });
  });

  // ─── getCurrentUserRole ────────────────────────────────────────────────────

  describe('getCurrentUserRole()', () => {
    it('returns null when no auth data', () => {
      expect(service.getCurrentUserRole()).toBeNull();
    });

    it('returns the role string', () => {
      setAuth(MOCK_AUTH_ADMIN);
      expect(service.getCurrentUserRole()).toBe('Admin');
    });
  });

  // ─── getPermissions ────────────────────────────────────────────────────────

  describe('getPermissions()', () => {
    it('returns null when no auth data', () => {
      expect(service.getPermissions()).toBeNull();
    });

    it('returns permissions object', () => {
      setAuth(MOCK_AUTH_OPERATOR);
      const perms = service.getPermissions();
      expect(perms).not.toBeNull();
      expect((perms as any)['inventory']).toBeDefined();
    });

    it('parses permissions stored as a JSON string', () => {
      const perms = { articles: { read: true } };
      setAuth({ ...MOCK_AUTH_OPERATOR, permissions: JSON.stringify(perms) as any });
      expect(service.getPermissions()).toEqual(perms);
    });

    it('returns null when permissions is a malformed JSON string', () => {
      setAuth({ ...MOCK_AUTH_OPERATOR, permissions: 'bad-json' as any });
      expect(service.getPermissions()).toBeNull();
    });
  });
});
