import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { LoadingService } from '../../../../services/extras/loading.service';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Spinner sutil en la esquina superior derecha -->
    <div 
      *ngIf="showSpinner" 
      class="loading-indicator"
      [class.visible]="showSpinner"
    >
      <div class="subtle-spinner"></div>
      <span class="loading-text" *ngIf="showText">Cargando</span>
    </div>

    <!-- Barra de progreso sutil en la parte superior -->
    <div 
      *ngIf="showSpinner" 
      class="loading-bar"
      [class.active]="showSpinner"
    ></div>
  `,
  styles: [`
    /* Indicador sutil en esquina superior derecha */
    .loading-indicator {
      position: fixed;
      top: 20px;
      right: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(8px);
      padding: 8px 12px;
      border-radius: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(0, 0, 0, 0.05);
      z-index: 1000;
      opacity: 0;
      transform: translateX(100px);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      font-size: 0.875rem;
      color: #6b7280;
    }

    .loading-indicator.visible {
      opacity: 1;
      transform: translateX(0);
    }

    /* Spinner pequeño y sutil */
    .subtle-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(59, 130, 246, 0.2);
      border-top: 2px solid #3b82f6;
      border-radius: 50%;
      animation: subtleSpin 1.2s linear infinite;
    }

    @keyframes subtleSpin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .loading-text {
      font-weight: 500;
      white-space: nowrap;
    }

    /* Barra de progreso sutil en la parte superior */
    .loading-bar {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background: linear-gradient(
        90deg,
        transparent,
        #3b82f6,
        transparent
      );
      z-index: 1001;
      opacity: 0;
      animation: loadingBarSlide 2s ease-in-out infinite;
    }

    .loading-bar.active {
      opacity: 0.6;
    }

    @keyframes loadingBarSlide {
      0% {
        transform: translateX(-100%);
      }
      50% {
        transform: translateX(0%);
      }
      100% {
        transform: translateX(100%);
      }
    }

    /* Responsive para móviles */
    @media (max-width: 640px) {
      .loading-indicator {
        top: 10px;
        right: 10px;
        padding: 6px 10px;
        font-size: 0.8rem;
      }
      
      .subtle-spinner {
        width: 14px;
        height: 14px;
      }
    }

    /* Modo oscuro */
    @media (prefers-color-scheme: dark) {
      .loading-indicator {
        background: rgba(31, 41, 55, 0.95);
        color: #d1d5db;
        border-color: rgba(255, 255, 255, 0.1);
      }
      
      .subtle-spinner {
        border-color: rgba(96, 165, 250, 0.3);
        border-top-color: #60a5fa;
      }
      
      .loading-bar {
        background: linear-gradient(
          90deg,
          transparent,
          #60a5fa,
          transparent
        );
      }
    }

    /* Estados adicionales para diferentes contextos */
    .loading-indicator:hover {
      transform: scale(1.02);
    }

    /* Animación de entrada más suave */
    @keyframes gentleFadeIn {
      from {
        opacity: 0;
        transform: translateX(20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
    }
  `]
})
export class LoadingSpinnerComponent implements OnInit, OnDestroy {
  showSpinner = false;
  showText = false;
  private subscription: Subscription = new Subscription();
  private showTimeout: any;
  private textTimeout: any;

  constructor(private loadingService: LoadingService) {}

  ngOnInit(): void {
    // Suscribirse al estado de carga con delay para evitar flashes
    this.subscription.add(
      this.loadingService.loading$.subscribe(loading => {
        if (loading) {
          // Delay inicial de 300ms para evitar flashes en peticiones rápidas
          this.showTimeout = setTimeout(() => {
            if (this.loadingService.isLoading) {
              this.showSpinner = true;
              
              // Mostrar texto después de 800ms adicionales
              this.textTimeout = setTimeout(() => {
                if (this.loadingService.isLoading) {
                  this.showText = true;
                }
              }, 600);
            }
          }, 200);
        } else {
          // Limpiar timeouts si la carga termina antes
          if (this.showTimeout) {
            clearTimeout(this.showTimeout);
          }
          if (this.textTimeout) {
            clearTimeout(this.textTimeout);
          }
          
          // Ocultar con una transición suave
          this.showSpinner = false;
          this.showText = false;
        }
      })
    );
  }

  ngOnDestroy(): void {
    // Limpiar timeouts y suscripciones
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
    }
    if (this.textTimeout) {
      clearTimeout(this.textTimeout);
    }
    this.subscription.unsubscribe();
  }
}
