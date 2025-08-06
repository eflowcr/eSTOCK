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
  
  // Future protected routes can be added here
  // Example:
  // {
  //   path: 'inventory',
  //   loadComponent: () => import('./components/inventory/inventory.component').then(m => m.InventoryComponent),
  //   canActivate: [AuthGuard]
  // },
  
  // Wildcard route - redirect to dashboard
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
