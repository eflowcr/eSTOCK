import { HttpErrorResponse } from '@angular/common/http';
import { RedirectService } from '@app/services/extras/redirect.service';
import { throwError } from 'rxjs';

export const handleError = (error: HttpErrorResponse, redirectService: RedirectService) => {
  if (error.status !== 200) {
    console.warn('Handle Error: Errors are not displayed for now (search in handleError)');
    localStorage.setItem('error', JSON.stringify(error));
  }

  // 401 handled by AuthInterceptor (clear session + redirect to login)
  if (error.status === 401) {
    return throwError(() => error.error);
  }
  // 403 message shown by AuthInterceptor
  if (error.status === 403) {
    return throwError(() => error.error);
  }

  // Pass body plus status so callers can detect 409 Conflict (e.g. duplicate SKU)
  const body = error.error ?? {};
  const payload = typeof body === 'object' && body !== null && !('status' in body)
    ? { ...body, status: error.status }
    : body;
  return throwError(() => payload);
};
