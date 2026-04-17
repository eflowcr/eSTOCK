import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { NavigationItems } from '../../models/navigation.model';
import { AuthorizationService } from './authorization.service';

const ALL_NAV_ITEMS: NavigationItems = [
  { name: 'dashboard', href: '/', icon: 'LayoutDashboard' },
  // Operations
  { name: 'receiving_tasks', href: '/receiving-tasks', icon: 'Download', permission: { resource: 'inventory', action: 'read' } },
  { name: 'picking_tasks', href: '/picking-tasks', icon: 'ClipboardCheck', permission: { resource: 'inventory', action: 'read' } },
  { name: 'stock_adjustments', href: '/stock-adjustments', icon: 'Edit', permission: { resource: 'inventory', action: 'update' } },
  { name: 'stock_alerts', href: '/stock-alerts', icon: 'AlertTriangle', permission: { resource: 'inventory', action: 'read' } },
  { name: 'stock_transfers', href: '/stock-transfers', icon: 'Truck', permission: { resource: 'inventory', action: 'read' } },
  // Inventory
  { name: 'articles', href: '/articles', icon: 'Tag', permission: { resource: 'articles', action: 'read' } },
  { name: 'inventory', href: '/inventory', icon: 'Archive', permission: { resource: 'inventory', action: 'read' } },
  { name: 'locations', href: '/locations', icon: 'MapPin', permission: { resource: 'locations', action: 'read' } },
  { name: 'presentation_conversions', href: '/presentation-conversions', icon: 'ArrowRightLeft', adminOnly: true },
  { name: 'barcode_generator', href: '/barcode-generator', icon: 'Barcode', permission: { resource: 'articles', action: 'read' } },
  // Administration
  { name: 'performance', href: '/gamification', icon: 'Trophy', adminOnly: true },
  { name: 'control_center', href: '/admin-control-center', icon: 'Monitor', adminOnly: true },
  { name: 'user_management', href: '/users', icon: 'UserCircle', adminOnly: true },
  // Settings hub — replaces the 4 config pages in the sidebar.
  // Roles, Location Types, Presentation Types, Conversions are reachable via /settings only.
  { name: 'settings', href: '/settings', icon: 'Settings', adminOnly: true },
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


