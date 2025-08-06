import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AlertService, Alert } from '../../../../services/extras/alert.service';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alert.component.html',
  styles: [`
    @keyframes slide-in-right {
      from {
        transform: translateX(100%) scale(0.95);
        opacity: 0;
      }
      to {
        transform: translateX(0) scale(1);
        opacity: 1;
      }
    }
    
    .animate-slide-in-right {
      animation: slide-in-right 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    
    /* Responsive para móviles */
    @media (max-width: 640px) {
      .fixed.bottom-4.right-4 {
        bottom: 1rem;
        right: 1rem;
        left: 1rem;
        max-width: none;
      }
    }
  `]
})
export class AlertComponent implements OnInit, OnDestroy {
  alerts: Alert[] = [];
  private subscription: Subscription = new Subscription();

  constructor(private alertService: AlertService) {}

  ngOnInit(): void {
    this.subscription = this.alertService.alerts$.subscribe(alerts => {
      this.alerts = alerts;
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  dismiss(id: string): void {
    this.alertService.dismiss(id);
  }

  trackByAlertId(index: number, alert: Alert): string {
    return alert.id;
  }

  getAlertClasses(type: string): string {
    const baseClasses = 'border-l-4';
    switch (type) {
      case 'success':
        return `${baseClasses} bg-white border-green-400 shadow-green-100 dark:bg-gray-800 dark:border-green-500 dark:shadow-green-900/20`;
      case 'error':
        return `${baseClasses} bg-white border-red-400 shadow-red-100 dark:bg-gray-800 dark:border-red-500 dark:shadow-red-900/20`;
      case 'warning':
        return `${baseClasses} bg-white border-yellow-400 shadow-yellow-100 dark:bg-gray-800 dark:border-yellow-500 dark:shadow-yellow-900/20`;
      case 'info':
        return `${baseClasses} bg-white border-blue-400 shadow-blue-100 dark:bg-gray-800 dark:border-blue-500 dark:shadow-blue-900/20`;
      default:
        return `${baseClasses} bg-white border-gray-400 shadow-gray-100 dark:bg-gray-800 dark:border-gray-500 dark:shadow-gray-900/20`;
    }
  }

  getTitleClasses(type: string): string {
    switch (type) {
      case 'success':
        return 'text-green-800 dark:text-green-200 font-semibold';
      case 'error':
        return 'text-red-800 dark:text-red-200 font-semibold';
      case 'warning':
        return 'text-yellow-800 dark:text-yellow-200 font-semibold';
      case 'info':
        return 'text-blue-800 dark:text-blue-200 font-semibold';
      default:
        return 'text-gray-800 dark:text-gray-200 font-semibold';
    }
  }

  getMessageClasses(type: string): string {
    switch (type) {
      case 'success':
        return 'text-gray-700 dark:text-gray-300';
      case 'error':
        return 'text-gray-700 dark:text-gray-300';
      case 'warning':
        return 'text-gray-700 dark:text-gray-300';
      case 'info':
        return 'text-gray-700 dark:text-gray-300';
      default:
        return 'text-gray-700 dark:text-gray-300';
    }
  }

  getDismissButtonClasses(type: string): string {
    const baseClasses = 'focus:ring-offset-2';
    switch (type) {
      case 'success':
        return `${baseClasses} text-green-400 hover:bg-green-100 focus:ring-green-600 dark:hover:bg-green-800`;
      case 'error':
        return `${baseClasses} text-red-400 hover:bg-red-100 focus:ring-red-600 dark:hover:bg-red-800`;
      case 'warning':
        return `${baseClasses} text-yellow-400 hover:bg-yellow-100 focus:ring-yellow-600 dark:hover:bg-yellow-800`;
      case 'info':
        return `${baseClasses} text-blue-400 hover:bg-blue-100 focus:ring-blue-600 dark:hover:bg-blue-800`;
      default:
        return `${baseClasses} text-gray-400 hover:bg-gray-100 focus:ring-gray-600 dark:hover:bg-gray-800`;
    }
  }
}
