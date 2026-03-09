import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthorizationService } from '../services/extras/authorization.service';

/**
 * Restricts access to administration routes to users with admin role or full permissions.
 * Use together with AuthGuard (AuthGuard first).
 */
@Injectable({
  providedIn: 'root',
})
export class AdminGuard implements CanActivate {
  constructor(
    private authorizationService: AuthorizationService,
    private router: Router
  ) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (this.authorizationService.isAdmin()) {
      return true;
    }
    this.router.navigate(['/dashboard'], { queryParams: { error: 'access_denied' } });
    return false;
  }
}
