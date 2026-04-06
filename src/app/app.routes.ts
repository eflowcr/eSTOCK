import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { NoAuthGuard } from './guards/no-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { PermissionGuard } from './guards/permission.guard';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [NoAuthGuard],
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard],
  },
  // Administration: admin only
  {
    path: 'users',
    loadComponent: () => import('./components/users/user-management/user-management.component').then((m) => m.UserManagementComponent),
    canActivate: [AuthGuard, AdminGuard],
  },
  {
    path: 'admin-control-center',
    loadComponent: () => import('./components/admin-control-center/admin-control-center-list.component').then((m) => m.AdminControlCenterListComponent),
    canActivate: [AuthGuard, AdminGuard],
  },
  {
    path: 'gamification',
    loadComponent: () => import('./components/gamification/gamification-management/gamification-management.component').then((m) => m.GamificationManagementComponent),
    canActivate: [AuthGuard, AdminGuard],
  },
  {
    path: 'location-types',
    loadComponent: () => import('./components/location-types/location-types-management/location-types-management.component').then((m) => m.LocationTypesManagementComponent),
    canActivate: [AuthGuard, AdminGuard],
  },
  {
    path: 'presentation-types',
    loadComponent: () => import('./components/presentation-types/presentation-types-management/presentation-types-management.component').then((m) => m.PresentationTypesManagementComponent),
    canActivate: [AuthGuard, AdminGuard],
  },
  {
    path: 'presentation-conversions',
    loadComponent: () => import('./components/presentation-conversions/presentation-conversions-management/presentation-conversions-management.component').then((m) => m.PresentationConversionsManagementComponent),
    canActivate: [AuthGuard, AdminGuard],
  },
  {
    path: 'stock-transfers',
    loadComponent: () => import('./components/stock-transfers/stock-transfers-management/stock-transfers-management.component').then((m) => m.StockTransfersManagementComponent),
    canActivate: [AuthGuard, PermissionGuard],
  },
  {
    path: 'settings',
    loadComponent: () => import('./components/settings/settings.component').then((m) => m.SettingsComponent),
    canActivate: [AuthGuard],
  },
  {
    path: 'roles',
    loadComponent: () => import('./components/roles/role-management/role-management.component').then((m) => m.RoleManagementComponent),
    canActivate: [AuthGuard, AdminGuard],
    children: [
      { path: '', loadComponent: () => import('./components/roles/role-list-page/role-list-page.component').then((m) => m.RoleListPageComponent) },
      { path: ':id', loadComponent: () => import('./components/roles/role-detail/role-detail.component').then((m) => m.RoleDetailComponent) },
    ],
  },
  // Protected by permission (resource/action)
  {
    path: 'locations',
    loadComponent: () => import('./components/locations/location-management/location-management.component').then((m) => m.LocationManagementComponent),
    canActivate: [AuthGuard, PermissionGuard],
  },
  {
    path: 'inventory',
    loadComponent: () => import('./components/inventory/inventory-management/inventory-management.component').then((m) => m.InventoryManagementComponent),
    canActivate: [AuthGuard, PermissionGuard],
  },
  {
    path: 'articles',
    loadComponent: () => import('./components/articles/article-management/article-management.component').then((m) => m.ArticleManagementComponent),
    canActivate: [AuthGuard, PermissionGuard],
  },
  {
    path: 'receiving-tasks',
    loadComponent: () => import('./components/receiving-tasks/receiving-task-management/receiving-task-management.component').then((m) => m.ReceivingTaskManagementComponent),
    canActivate: [AuthGuard, PermissionGuard],
  },
  {
    path: 'picking-tasks',
    loadComponent: () => import('./components/picking-tasks/picking-task-management/picking-task-management.component').then((m) => m.PickingTaskManagementComponent),
    canActivate: [AuthGuard, PermissionGuard],
  },
  {
    path: 'stock-adjustments',
    loadComponent: () => import('./components/adjustments/adjustment-management/adjustment-management.component').then((m) => m.AdjustmentManagementComponent),
    canActivate: [AuthGuard, PermissionGuard],
  },
  {
    path: 'stock-alerts',
    loadComponent: () => import('./components/stock-alerts/stock-alerts-management/stock-alerts-management.component').then((m) => m.StockAlertsManagementComponent),
    canActivate: [AuthGuard, PermissionGuard],
  },
  {
    path: 'barcode-generator',
    loadComponent: () => import('./components/barcode-generator/barcode-generator-management/barcode-generator-management.component').then((m) => m.BarcodeGeneratorManagementComponent),
    canActivate: [AuthGuard, PermissionGuard],
  },
  {
    path: '**',
    redirectTo: '/dashboard',
  },
];
