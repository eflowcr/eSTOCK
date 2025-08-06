import { HttpErrorResponse } from '@angular/common/http';
import { RedirectService } from '@app/services/extras/redirect.service';
import { throwError } from 'rxjs';

export const handleError = (error: HttpErrorResponse, redirectService: RedirectService) => {
  if (error.status !== 200) {
    console.warn('Handle Error: Errors are not displayed for now (search in handleError)');
    localStorage.setItem('error', JSON.stringify(error));
  }

  if (error.status === 401) {
    redirectService.redirectToLogin();
  }

  return throwError(() => error.error);
};
