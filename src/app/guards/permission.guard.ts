import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { getRoutePermission, routeRequiresPermission } from '../config/route-permissions.config';
import { AuthorizationService } from '../services/extras/authorization.service';

/**
 * Guards routes that require a specific resource/action permission.
 * Use after AuthGuard. If the route has no permission requirement, access is allowed.
 */
@Injectable({
  providedIn: 'root',
})
export class PermissionGuard implements CanActivate {
  constructor(
    private authorizationService: AuthorizationService,
    private router: Router
  ) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const url = state.url.split('?')[0];
    if (!routeRequiresPermission(url)) {
      return true;
    }
    const required = getRoutePermission(url);
    if (!required) return true;
    if (this.authorizationService.hasPermission(required.resource, required.action)) {
      return true;
    }
    this.router.navigate(['/dashboard'], { queryParams: { error: 'access_denied' } });
    return false;
  }
}
