import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { NavigationItems } from '../../models/navigation.model';

@Injectable({ providedIn: 'root' })
export class NavigationService {
  public itemsSubject = new BehaviorSubject<NavigationItems>([
    { name: 'dashboard', href: '/', icon: 'LayoutDashboard' },
    { name: 'articles', href: '/articles', icon: 'PackageOpen' },
    { name: 'inventory', href: '/inventory', icon: 'Package' },
    { name: 'receiving_tasks', href: '/receiving-tasks', icon: 'Download' },
    { name: 'picking_tasks', href: '/picking-tasks', icon: 'Upload' },
    { name: 'stock_adjustments', href: '/stock-adjustments', icon: 'Edit' },
    { name: 'stock_alerts', href: '/stock-alerts', icon: 'AlertTriangle' },
    { name: 'barcode_generator', href: '/barcode-generator', icon: 'QrCode' },
    { name: 'performance', href: '/gamification', icon: 'Trophy' },
    { name: 'control_center', href: '/admin-control-center', icon: 'Monitor' },
    { name: 'locations', href: '/locations', icon: 'MapPin' },
    { name: 'user_management', href: '/users', icon: 'Users' },
  ]);

  items$ = this.itemsSubject.asObservable();

  getItems(): NavigationItems {
    return this.itemsSubject.value;
  }
}


