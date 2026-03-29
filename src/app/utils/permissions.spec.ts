import { hasPermission, hasResourceAccess } from './permissions';
import type { Permission } from '@app/models/auth.model';

// ─── hasPermission ─────────────────────────────────────────────────────────────

describe('hasPermission', () => {
  it('returns false when permissions is null', () => {
    expect(hasPermission('articles', 'read', null)).toBe(false);
  });

  it('returns false when permissions is undefined', () => {
    expect(hasPermission('articles', 'read', undefined)).toBe(false);
  });

  it('returns true for admin (all: true) on any resource/action', () => {
    const adminPerms: Permission = { all: true };
    expect(hasPermission('articles', 'read', adminPerms)).toBe(true);
    expect(hasPermission('inventory', 'delete', adminPerms)).toBe(true);
    expect(hasPermission('users', 'create', adminPerms)).toBe(true);
  });

  it('returns false for admin (all: false)', () => {
    const perms: Permission = { all: false } as any;
    expect(hasPermission('articles', 'read', perms)).toBe(false);
  });

  it('returns true when resource+action is granted', () => {
    const perms: Permission = { articles: { read: true, create: false, update: false, delete: false } };
    expect(hasPermission('articles', 'read', perms)).toBe(true);
  });

  it('returns false when action is explicitly false', () => {
    const perms: Permission = { articles: { read: true, create: false } };
    expect(hasPermission('articles', 'create', perms)).toBe(false);
  });

  it('returns false when action is not listed in resource', () => {
    const perms: Permission = { articles: { read: true } };
    expect(hasPermission('articles', 'delete', perms)).toBe(false);
  });

  it('returns false when resource does not exist in permissions', () => {
    const perms: Permission = { articles: { read: true } };
    expect(hasPermission('inventory', 'read', perms)).toBe(false);
  });

  it('parses permissions when passed as a JSON string', () => {
    const perms = JSON.stringify({ articles: { read: true } }) as any;
    expect(hasPermission('articles', 'read', perms)).toBe(true);
  });

  it('returns false on invalid JSON string', () => {
    expect(hasPermission('articles', 'read', 'not-json' as any)).toBe(false);
  });

  it('handles multiple resources independently', () => {
    const perms: Permission = {
      articles: { read: true, create: true },
      inventory: { read: true, update: false },
    };
    expect(hasPermission('articles', 'create', perms)).toBe(true);
    expect(hasPermission('inventory', 'update', perms)).toBe(false);
    expect(hasPermission('locations', 'read', perms)).toBe(false);
  });
});

// ─── hasResourceAccess ────────────────────────────────────────────────────────

describe('hasResourceAccess', () => {
  it('returns false when permissions is null', () => {
    expect(hasResourceAccess('articles', null)).toBe(false);
  });

  it('returns true for admin (all: true)', () => {
    expect(hasResourceAccess('articles', { all: true })).toBe(true);
  });

  it('returns true when at least one action for the resource is true', () => {
    const perms: Permission = { articles: { read: true, create: false, update: false } };
    expect(hasResourceAccess('articles', perms)).toBe(true);
  });

  it('returns false when all actions for the resource are false', () => {
    const perms: Permission = { articles: { read: false, create: false, update: false } };
    expect(hasResourceAccess('articles', perms)).toBe(false);
  });

  it('returns false when resource is not present', () => {
    const perms: Permission = { articles: { read: true } };
    expect(hasResourceAccess('inventory', perms)).toBe(false);
  });

  it('parses JSON string permissions', () => {
    const perms = JSON.stringify({ articles: { read: true } }) as any;
    expect(hasResourceAccess('articles', perms)).toBe(true);
  });
});
