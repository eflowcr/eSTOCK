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
    // URLs que queremos excluir del spinner (opcional)
    const excludedUrls = [
      '/assets/',
      '/health',
      '/ping'
    ];

    // Verificar si la URL debe ser excluida
    const shouldExclude = excludedUrls.some(url => req.url.includes(url));
    
    if (shouldExclude) {
      return next.handle(req);
    }

    // Marcar el inicio de la petición
    const startTime = Date.now();
    let hasShownSpinner = false;
    
    // Mostrar spinner con un pequeño delay para peticiones que tarden más de 200ms
    const showSpinnerTimeout = setTimeout(() => {
      this.loadingService.show();
      hasShownSpinner = true;
    }, 200);

    return next.handle(req).pipe(
      tap({
        next: (event: HttpEvent<any>) => {
          if (event instanceof HttpResponse && environment.TESTING) {
            const duration = Date.now() - startTime;
            console.log(`✅ HTTP ${req.method} ${req.url} - Status: ${event.status} (${duration}ms)`);
          }
        },
        error: (error: HttpErrorResponse) => {
          if (environment.TESTING) {
            const duration = Date.now() - startTime;
            console.error(`❌ HTTP ${req.method} ${req.url} - Error: ${error.status} ${error.statusText} (${duration}ms)`);
          }
        }
      }),
      finalize(() => {
        // Limpiar el timeout si la petición termina antes
        clearTimeout(showSpinnerTimeout);
        
        // Solo ocultar si se mostró el spinner
        if (hasShownSpinner) {
          this.loadingService.hide();
        }
      })
    );
  }
}
