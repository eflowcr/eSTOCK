import { Routes } from '@angular/router';
import { routes } from './app.routes';

// B18 (S3.7-W4): /billing previously hit the wildcard route and silently
// landed on /dashboard. The fix aliases it to /settings/billing so external
// links (Stripe redirects, marketing emails, docs) resolve to the real
// billing settings page.
describe('App routes — B18 billing redirect', () => {
  function findRoute(routeList: Routes, path: string) {
    return routeList.find((r) => r.path === path);
  }

  it('exposes a top-level /billing route', () => {
    expect(findRoute(routes, 'billing')).toBeDefined();
  });

  it('/billing redirects to /settings/billing', () => {
    const route = findRoute(routes, 'billing');
    expect(route?.redirectTo).toBe('/settings/billing');
    expect(route?.pathMatch).toBe('full');
  });

  it('keeps the original /settings/billing route intact', () => {
    const route = findRoute(routes, 'settings/billing');
    expect(route).toBeDefined();
    expect(route?.loadComponent).toBeDefined();
  });
});
