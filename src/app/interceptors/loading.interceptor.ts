import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, finalize } from 'rxjs/operators';
import { LoadingService } from '../services/extras/loading.service';
import { environment } from '../../enviroment/environment.base';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {

  constructor(private loadingService: LoadingService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const excludedUrls = [
      '/assets/',
      '/health',
      '/ping'
    ];

    const shouldExclude = excludedUrls.some(url => req.url.includes(url));
    
    if (shouldExclude) {
      return next.handle(req);
    }

    const startTime = Date.now();
    let hasShownSpinner = false;
    
    const showSpinnerTimeout = setTimeout(() => {
      this.loadingService.show();
      hasShownSpinner = true;
    }, 200);

    return next.handle(req).pipe(
      tap({
        next: (event: HttpEvent<any>) => {
          if (event instanceof HttpResponse && environment.TESTING) {
            const duration = Date.now() - startTime;
          }
        },
        error: (error: HttpErrorResponse) => {
          if (environment.TESTING) {
            const duration = Date.now() - startTime;
          }
        }
      }),
      finalize(() => {
        clearTimeout(showSpinnerTimeout);
        
        if (hasShownSpinner) {
          this.loadingService.hide();
        }
      })
    );
  }
}
