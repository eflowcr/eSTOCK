import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private requestCount = 0;

  /**
   * Observable para suscribirse al estado de carga
   */
  public loading$: Observable<boolean> = this.loadingSubject.asObservable();

  /**
   * Inicia el estado de carga
   */
  show(): void {
    this.requestCount++;
    if (this.requestCount === 1) {
      this.loadingSubject.next(true);
    }
  }

  /**
   * Termina el estado de carga
   */
  hide(): void {
    this.requestCount--;
    if (this.requestCount <= 0) {
      this.requestCount = 0;
      this.loadingSubject.next(false);
    }
  }

  /**
   * Fuerza el estado de carga (útil para casos especiales)
   */
  setLoading(loading: boolean): void {
    this.requestCount = loading ? 1 : 0;
    this.loadingSubject.next(loading);
  }

  /**
   * Obtiene el estado actual de carga
   */
  get isLoading(): boolean {
    return this.loadingSubject.value;
  }

  /**
   * Obtiene el número actual de peticiones activas
   */
  get activeRequests(): number {
    return this.requestCount;
  }
}
