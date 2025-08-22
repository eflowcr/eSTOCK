import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { NoAuthGuard } from './guards/no-auth.guard';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';

export const routes: Routes = [
  // Default route - redirect to dashboard if authenticated, login if not
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  
  // Login route - only accessible when not authenticated
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [NoAuthGuard]
  },
  
  // Dashboard route - requires authentication
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard]
  },
  
  // User Management route - requires authentication
  {
    path: 'users',
    loadComponent: () => import('./components/users/user-management/user-management.component').then(m => m.UserManagementComponent),
    canActivate: [AuthGuard]
  },
  
  // Location Management route - requires authentication
  {
    path: 'locations',
    loadComponent: () => import('./components/locations/location-management/location-management.component').then(m => m.LocationManagementComponent),
    canActivate: [AuthGuard]
  },
  
  // Inventory Management route - requires authentication
  {
    path: 'inventory',
    loadComponent: () => import('./components/inventory/inventory-management/inventory-management.component').then(m => m.InventoryManagementComponent),
    canActivate: [AuthGuard]
  },
  
  // Article Management route - requires authentication
  {
    path: 'articles',
    loadComponent: () => import('./components/articles/article-management/article-management.component').then(m => m.ArticleManagementComponent),
    canActivate: [AuthGuard]
  },

  // Receiving Tasks Management route - requires authentication
  {
    path: 'receiving-tasks',
    loadComponent: () => import('./components/receiving-tasks/receiving-task-management/receiving-task-management.component').then(m => m.ReceivingTaskManagementComponent),
    canActivate: [AuthGuard]
  },

  // Picking Tasks Management route - requires authentication
  {
    path: 'picking-tasks',
    loadComponent: () => import('./components/picking-tasks/picking-task-management/picking-task-management.component').then(m => m.PickingTaskManagementComponent),
    canActivate: [AuthGuard]
  },

  // Adjustments Management route - requires authentication
  {
    path: 'stock-adjustments',
    loadComponent: () => import('./components/adjustments/adjustment-management/adjustment-management.component').then(m => m.AdjustmentManagementComponent),
    canActivate: [AuthGuard]
  },

  // Stock Alerts Management route - requires authentication
  {
    path: 'stock-alerts',
    loadComponent: () => import('./components/stock-alerts/stock-alerts-management/stock-alerts-management.component').then(m => m.StockAlertsManagementComponent),
    canActivate: [AuthGuard]
  },

  // Barcode Generator route - requires authentication
  {
    path: 'barcode-generator',
    loadComponent: () => import('./components/barcode-generator/barcode-generator-management/barcode-generator-management.component').then(m => m.BarcodeGeneratorManagementComponent),
    canActivate: [AuthGuard]
  },

  // Gamification route - requires authentication
  {
    path: 'gamification',
    loadComponent: () => import('./components/gamification/gamification-management/gamification-management.component').then(m => m.GamificationManagementComponent),
    canActivate: [AuthGuard]
  },

  // Admin Control Center route - requires authentication
  {
    path: 'admin-control-center',
    loadComponent: () => import('./components/admin-control-center/admin-control-center-list.component').then(m => m.AdminControlCenterListComponent),
    canActivate: [AuthGuard]
  },

  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
