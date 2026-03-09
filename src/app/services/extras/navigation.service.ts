import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { NavigationItems } from '../../models/navigation.model';
import { AuthorizationService } from './authorization.service';

const ALL_NAV_ITEMS: NavigationItems = [
  { name: 'dashboard', href: '/', icon: 'LayoutDashboard' },
  { name: 'articles', href: '/articles', icon: 'PackageOpen', permission: { resource: 'articles', action: 'read' } },
  { name: 'inventory', href: '/inventory', icon: 'Package', permission: { resource: 'inventory', action: 'read' } },
  { name: 'receiving_tasks', href: '/receiving-tasks', icon: 'Download', permission: { resource: 'inventory', action: 'read' } },
  { name: 'picking_tasks', href: '/picking-tasks', icon: 'Upload', permission: { resource: 'inventory', action: 'read' } },
  { name: 'stock_adjustments', href: '/stock-adjustments', icon: 'Edit', permission: { resource: 'inventory', action: 'update' } },
  { name: 'stock_alerts', href: '/stock-alerts', icon: 'AlertTriangle', permission: { resource: 'inventory', action: 'read' } },
  { name: 'barcode_generator', href: '/barcode-generator', icon: 'QrCode', permission: { resource: 'articles', action: 'read' } },
  { name: 'performance', href: '/gamification', icon: 'Trophy', adminOnly: true },
  { name: 'control_center', href: '/admin-control-center', icon: 'Monitor', adminOnly: true },
  { name: 'locations', href: '/locations', icon: 'MapPin', permission: { resource: 'locations', action: 'read' } },
  { name: 'user_management', href: '/users', icon: 'Users', adminOnly: true },
  { name: 'roles', href: '/roles', icon: 'Shield', adminOnly: true },
  { name: 'location_types', href: '/location-types', icon: 'Layers', adminOnly: true },
];

@Injectable({ providedIn: 'root' })
export class NavigationService {
  constructor(private authorizationService: AuthorizationService) {}

  public itemsSubject = new BehaviorSubject<NavigationItems>(ALL_NAV_ITEMS);

  items$ = this.itemsSubject.asObservable();

  /** Returns all nav items (for backwards compatibility). */
  getItems(): NavigationItems {
    return this.getFilteredItems();
  }

  /** Returns nav items visible to the current user (by permission and admin). */
  getFilteredItems(): NavigationItems {
    const auth = this.authorizationService;
    return ALL_NAV_ITEMS.filter((item) => {
      if (item.adminOnly) return auth.isAdmin();
      if (item.permission) return auth.hasPermission(item.permission.resource, item.permission.action);
      return auth.isAuthenticated();
    });
  }
}


