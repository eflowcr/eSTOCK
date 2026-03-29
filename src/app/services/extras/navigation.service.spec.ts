import { TestBed } from '@angular/core/testing';
import { NavigationService } from './navigation.service';
import { AuthorizationService } from './authorization.service';

describe('NavigationService', () => {
  let service: NavigationService;
  let authSpy: jasmine.SpyObj<AuthorizationService>;

  beforeEach(() => {
    authSpy = jasmine.createSpyObj('AuthorizationService', [
      'isAdmin',
      'hasPermission',
      'isAuthenticated',
    ]);

    TestBed.configureTestingModule({
      providers: [
        NavigationService,
        { provide: AuthorizationService, useValue: authSpy },
      ],
    });

    service = TestBed.inject(NavigationService);
  });

  // ─── getFilteredItems ──────────────────────────────────────────────────────

  describe('getFilteredItems()', () => {
    it('returns only dashboard when authenticated but no permissions and not admin', () => {
      authSpy.isAuthenticated.and.returnValue(true);
      authSpy.isAdmin.and.returnValue(false);
      authSpy.hasPermission.and.returnValue(false);

      const items = service.getFilteredItems();
      expect(items.length).toBe(1);
      expect(items[0].name).toBe('dashboard');
    });

    it('returns all nav items for an admin user', () => {
      authSpy.isAuthenticated.and.returnValue(true);
      authSpy.isAdmin.and.returnValue(true);
      authSpy.hasPermission.and.returnValue(true);

      const items = service.getFilteredItems();
      // Should include dashboard + all permission items + all admin-only items
      expect(items.length).toBeGreaterThanOrEqual(15);
    });

    it('excludes all adminOnly items for a non-admin user', () => {
      authSpy.isAuthenticated.and.returnValue(true);
      authSpy.isAdmin.and.returnValue(false);
      authSpy.hasPermission.and.returnValue(true);

      const items = service.getFilteredItems();
      const adminOnlyNames = ['performance', 'control_center', 'user_management', 'settings', 'presentation_conversions'];
      adminOnlyNames.forEach(name => {
        expect(items.find(i => i.name === name)).toBeUndefined(`${name} should not appear for non-admin`);
      });
    });

    it('includes articles item when user has articles:read permission', () => {
      authSpy.isAuthenticated.and.returnValue(true);
      authSpy.isAdmin.and.returnValue(false);
      authSpy.hasPermission.and.callFake((resource: string, action: string) =>
        resource === 'articles' && action === 'read'
      );

      const items = service.getFilteredItems();
      expect(items.find(i => i.name === 'articles')).toBeDefined();
      expect(items.find(i => i.name === 'barcode_generator')).toBeDefined();
    });

    it('excludes inventory items when user lacks inventory:read permission', () => {
      authSpy.isAuthenticated.and.returnValue(true);
      authSpy.isAdmin.and.returnValue(false);
      authSpy.hasPermission.and.callFake((resource: string, action: string) =>
        resource === 'articles' && action === 'read'
      );

      const items = service.getFilteredItems();
      expect(items.find(i => i.name === 'inventory')).toBeUndefined();
      expect(items.find(i => i.name === 'receiving_tasks')).toBeUndefined();
    });

    it('includes stock_adjustments for inventory:update permission', () => {
      authSpy.isAuthenticated.and.returnValue(true);
      authSpy.isAdmin.and.returnValue(false);
      authSpy.hasPermission.and.callFake((resource: string, action: string) =>
        resource === 'inventory' && action === 'update'
      );

      const items = service.getFilteredItems();
      expect(items.find(i => i.name === 'stock_adjustments')).toBeDefined();
    });

    it('returns empty array when not authenticated and not admin', () => {
      authSpy.isAuthenticated.and.returnValue(false);
      authSpy.isAdmin.and.returnValue(false);
      authSpy.hasPermission.and.returnValue(false);

      const items = service.getFilteredItems();
      expect(items.length).toBe(0);
    });

    it('admin sees presentation_conversions and settings', () => {
      authSpy.isAuthenticated.and.returnValue(true);
      authSpy.isAdmin.and.returnValue(true);
      authSpy.hasPermission.and.returnValue(true);

      const items = service.getFilteredItems();
      expect(items.find(i => i.name === 'presentation_conversions')).toBeDefined();
      expect(items.find(i => i.name === 'settings')).toBeDefined();
    });
  });

  // ─── getItems (alias) ──────────────────────────────────────────────────────

  describe('getItems()', () => {
    it('returns the same result as getFilteredItems()', () => {
      authSpy.isAuthenticated.and.returnValue(true);
      authSpy.isAdmin.and.returnValue(true);
      authSpy.hasPermission.and.returnValue(true);

      expect(service.getItems()).toEqual(service.getFilteredItems());
    });
  });

  // ─── items$ observable ────────────────────────────────────────────────────

  describe('items$', () => {
    it('emits the full list of all nav items immediately', (done) => {
      service.items$.subscribe(items => {
        expect(items.length).toBeGreaterThan(0);
        expect(items.find(i => i.name === 'dashboard')).toBeDefined();
        done();
      });
    });
  });
});
