import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { AlertService } from '../services/extras/alert.service';
import { getBearerToken } from '@app/utils/get-token';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  // B13 fix S3.6: when a request fires before AuthService has fully bootstrapped
  // (e.g. dashboard quick-link → /receiving-tasks first paint), the JWT may not
  // be on the request even though it's already in localStorage. We retry once
  // after a short delay using a fresh token read. Marker prevents infinite loops.
  private static readonly RETRY_HEADER = 'X-Auth-Retry-Once';

  constructor(
    private authService: AuthService,
    private alertService: AlertService
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = getBearerToken();
    let authReq = req;
    if (token) {
      authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
    }
    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // First-mount race: maybe the token was missing on the original
          // request because of a pre-bootstrap call. Retry once after 150ms
          // with a freshly-read token before clearing session.
          if (!req.headers.has(AuthInterceptor.RETRY_HEADER)) {
            return timer(150).pipe(
              mergeMap(() => {
                const freshToken = getBearerToken();
                if (!freshToken) {
                  this.authService.clearSession();
                  return throwError(() => error);
                }
                const retryReq = req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${freshToken}`,
                    [AuthInterceptor.RETRY_HEADER]: '1',
                  },
                });
                return next.handle(retryReq).pipe(
                  catchError((err2: HttpErrorResponse) => {
                    if (err2.status === 401) {
                      this.authService.clearSession();
                    }
                    return throwError(() => err2);
                  }),
                );
              }),
            );
          }
          this.authService.clearSession();
        } else if (error.status === 403) {
          this.alertService.error(
            error?.error?.message || 'You do not have permission to perform this action.',
            'Forbidden'
          );
        }
        return throwError(() => error);
      })
    );
  }
}
