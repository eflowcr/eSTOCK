import { Injectable } from '@angular/core';
import { LoadingService } from '../services/extras/loading.service';

/**
 * Utilidades para manejar el estado de carga de forma manual
 * Útil para operaciones que no son peticiones HTTP
 */
@Injectable({
  providedIn: 'root'
})
export class LoadingUtils {
  
  constructor(private loadingService: LoadingService) {}

  /**
   * Ejecuta una función asíncrona mostrando el spinner
   * @param asyncFunction Función asíncrona a ejecutar
   * @param showSpinner Si mostrar el spinner (default: true)
   * @returns Promise con el resultado de la función
   */
  async executeWithLoading<T>(
    asyncFunction: () => Promise<T>,
    showSpinner: boolean = true
  ): Promise<T> {
    try {
      if (showSpinner) {
        this.loadingService.show();
      }
      
      const result = await asyncFunction();
      return result;
    } catch (error) {
      throw error;
    } finally {
      if (showSpinner) {
        this.loadingService.hide();
      }
    }
  }

  /**
   * Muestra el spinner manualmente
   */
  showSpinner(): void {
    this.loadingService.show();
  }

  /**
   * Oculta el spinner manualmente
   */
  hideSpinner(): void {
    this.loadingService.hide();
  }

  /**
   * Obtiene el estado actual del spinner
   */
  get isLoading(): boolean {
    return this.loadingService.isLoading;
  }
}

/**
 * Decorator para métodos que requieren mostrar spinner
 * Uso: @WithLoading() async myMethod() { ... }
 */
export function WithLoading(showSpinner: boolean = true) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const loadingService = (this as any).loadingService || 
        (this as any).injector?.get(LoadingService);
      
      if (!loadingService) {
        console.warn('LoadingService not found. Make sure to inject it in your component/service.');
        return method.apply(this, args);
      }

      try {
        if (showSpinner) {
          loadingService.show();
        }
        
        const result = await method.apply(this, args);
        return result;
      } catch (error) {
        throw error;
      } finally {
        if (showSpinner) {
          loadingService.hide();
        }
      }
    };
  };
}
