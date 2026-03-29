import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse, MOCK_AUTH_ADMIN } from '../../__tests__/mocks/data';

// Minimal valid JWT with payload { user_id: 1, user_name: 'Admin', email: 'admin@estock.com', role: 'Admin' }
const MOCK_JWT =
  'eyJhbGciOiJIUzI1NiJ9.' +
  btoa(JSON.stringify({ user_id: 1, user_name: 'Admin', email: 'admin@estock.com', role: 'Admin' })) +
  '.signature';

const MOCK_AUTH_DATA = { ...MOCK_AUTH_ADMIN, token: MOCK_JWT };

const STORAGE_KEY = 'auth_estock';

describe('AuthService', () => {
  let service: AuthService;
  let fetchSpy: jasmine.SpyObj<FetchService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    localStorage.clear();

    fetchSpy = jasmine.createSpyObj('FetchService', ['post', 'patch']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl']);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: FetchService, useValue: fetchSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  afterEach(() => localStorage.clear());

  // ─── initial state ────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts unauthenticated when localStorage is empty', () => {
      expect(service.isAuthenticated()).toBeFalse();
      expect(service.getCurrentUser()).toBeNull();
    });

    it('restores state from valid token in localStorage', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_AUTH_DATA));
      const fresh = new AuthService(fetchSpy, routerSpy);
      expect(fresh.isAuthenticated()).toBeTrue();
      expect(fresh.getCurrentUser()?.role).toBe('Admin');
    });

    it('clears invalid token from localStorage', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 'not.a.jwt' }));
      const fresh = new AuthService(fetchSpy, routerSpy);
      expect(fresh.isAuthenticated()).toBeFalse();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  // ─── login ────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('calls POST /auth/login with credentials', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse(MOCK_AUTH_DATA)));
      await service.login({ email: 'admin@estock.com', password: 'secret' });
      expect(fetchSpy.post).toHaveBeenCalledWith(
        jasmine.objectContaining({
          API_Gateway: jasmine.stringContaining('/auth/login'),
          values: { email: 'admin@estock.com', password: 'secret' },
        })
      );
    });

    it('stores auth data in localStorage on success', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse(MOCK_AUTH_DATA)));
      await service.login({ email: 'admin@estock.com', password: 'secret' });
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(stored.token).toBe(MOCK_JWT);
    });

    it('sets isAuthenticated to true on success', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse(MOCK_AUTH_DATA)));
      await service.login({ email: 'admin@estock.com', password: 'secret' });
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('navigates to dashboard on success', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse(MOCK_AUTH_DATA)));
      await service.login({ email: 'admin@estock.com', password: 'secret' });
      expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/dashboard');
    });

    it('throws and updates error state on failure', async () => {
      fetchSpy.post.and.returnValue(Promise.reject({ message: 'Invalid credentials' }));
      await expectAsync(
        service.login({ email: 'bad@estock.com', password: 'wrong' })
      ).toBeRejected();
    });
  });

  // ─── logout ───────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('navigates to /login', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({})));
      await service.logout();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('clears localStorage', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_AUTH_DATA));
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({})));
      await service.logout();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('completes logout even when server call fails', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_AUTH_DATA));
      // Re-create service so it loads the stored token
      service = new AuthService(fetchSpy, routerSpy);
      fetchSpy.post.and.returnValue(Promise.reject(new Error('Network error')));
      await service.logout();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('sets isAuthenticated to false', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse(MOCK_AUTH_DATA)));
      await service.login({ email: 'admin@estock.com', password: 'secret' });
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({})));
      await service.logout();
      expect(service.isAuthenticated()).toBeFalse();
    });
  });

  // ─── clearSession ─────────────────────────────────────────────────────────

  describe('clearSession()', () => {
    it('clears state and navigates to login', () => {
      service.clearSession();
      expect(service.isAuthenticated()).toBeFalse();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  // ─── getToken ─────────────────────────────────────────────────────────────

  describe('getToken()', () => {
    it('returns null when not authenticated', () => {
      expect(service.getToken()).toBeNull();
    });

    it('returns token from localStorage', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_AUTH_DATA));
      expect(service.getToken()).toBe(MOCK_JWT);
    });
  });

  // ─── hasRole ──────────────────────────────────────────────────────────────

  describe('hasRole()', () => {
    it('returns false when not authenticated', () => {
      expect(service.hasRole('Admin')).toBeFalse();
    });

    it('returns true for matching role', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse(MOCK_AUTH_DATA)));
      await service.login({ email: 'admin@estock.com', password: 'secret' });
      expect(service.hasRole('Admin')).toBeTrue();
    });

    it('returns false for non-matching role', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse(MOCK_AUTH_DATA)));
      await service.login({ email: 'admin@estock.com', password: 'secret' });
      expect(service.hasRole('Operator')).toBeFalse();
    });
  });

  // ─── changePassword ───────────────────────────────────────────────────────

  describe('changePassword()', () => {
    it('calls POST /auth/change-password with passwords', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({})));
      await service.changePassword('old', 'new');
      expect(fetchSpy.post).toHaveBeenCalledWith(
        jasmine.objectContaining({
          API_Gateway: jasmine.stringContaining('change-password'),
          values: { currentPassword: 'old', newPassword: 'new' },
        })
      );
    });
  });

  // ─── forgotPassword ───────────────────────────────────────────────────────

  describe('forgotPassword()', () => {
    it('calls POST /auth/forgot-password with email', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({})));
      await service.forgotPassword('admin@estock.com');
      expect(fetchSpy.post).toHaveBeenCalledWith(
        jasmine.objectContaining({
          API_Gateway: jasmine.stringContaining('forgot-password'),
          values: { email: 'admin@estock.com' },
        })
      );
    });
  });

  // ─── resetPassword ────────────────────────────────────────────────────────

  describe('resetPassword()', () => {
    it('calls POST /auth/reset-password with token and new password', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({})));
      await service.resetPassword('reset-token', 'newPassword123');
      expect(fetchSpy.post).toHaveBeenCalledWith(
        jasmine.objectContaining({
          API_Gateway: jasmine.stringContaining('reset-password'),
          values: { token: 'reset-token', newPassword: 'newPassword123' },
        })
      );
    });
  });
});
