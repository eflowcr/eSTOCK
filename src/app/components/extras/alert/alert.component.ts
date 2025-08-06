import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AlertService, Alert } from '../../../services/extras/alert.service';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alert.component.html'
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

  getAlertClasses(type: string): string {
    const baseClasses = 'border';
    switch (type) {
      case 'success':
        return `${baseClasses} bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800`;
      case 'error':
        return `${baseClasses} bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800`;
      case 'warning':
        return `${baseClasses} bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800`;
      case 'info':
        return `${baseClasses} bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800`;
      default:
        return `${baseClasses} bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800`;
    }
  }

  getTitleClasses(type: string): string {
    switch (type) {
      case 'success':
        return 'text-green-800 dark:text-green-200';
      case 'error':
        return 'text-red-800 dark:text-red-200';
      case 'warning':
        return 'text-yellow-800 dark:text-yellow-200';
      case 'info':
        return 'text-blue-800 dark:text-blue-200';
      default:
        return 'text-gray-800 dark:text-gray-200';
    }
  }

  getMessageClasses(type: string): string {
    switch (type) {
      case 'success':
        return 'text-green-700 dark:text-green-300';
      case 'error':
        return 'text-red-700 dark:text-red-300';
      case 'warning':
        return 'text-yellow-700 dark:text-yellow-300';
      case 'info':
        return 'text-blue-700 dark:text-blue-300';
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
