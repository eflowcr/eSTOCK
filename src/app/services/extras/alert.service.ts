import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Alert {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number; // milliseconds, 0 = no auto-dismiss
  dismissible?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private alertsSubject = new BehaviorSubject<Alert[]>([]);
  public alerts$ = this.alertsSubject.asObservable();

  constructor() {}

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private addAlert(alert: Omit<Alert, 'id'>): void {
    const newAlert: Alert = {
      id: this.generateId(),
      dismissible: true,
      duration: 1500, 
      ...alert
    };

    const currentAlerts = this.alertsSubject.value;
    this.alertsSubject.next([...currentAlerts, newAlert]);

    // Auto-dismiss if duration is set
    if (newAlert.duration && newAlert.duration > 0) {
      setTimeout(() => {
        this.dismiss(newAlert.id);
      }, newAlert.duration);
    }
  }

  success(message: string, title?: string, options?: Partial<Alert>): void {
    this.addAlert({
      type: 'success',
      title,
      message,
      duration: 1500,
      ...options
    });
  }

  error(message: string, title?: string, options?: Partial<Alert>): void {
    this.addAlert({
      type: 'error',
      title,
      message,
      duration: 1500,
      ...options
    });
  }

  warning(message: string, title?: string, options?: Partial<Alert>): void {
    this.addAlert({
      type: 'warning',
      title,
      message,
      duration: 1500,
      ...options
    });
  }

  info(message: string, title?: string, options?: Partial<Alert>): void {
    this.addAlert({
      type: 'info',
      title,
      message,
      duration: 1500,
      ...options
    });
  }

  dismiss(id: string): void {
    const currentAlerts = this.alertsSubject.value;
    this.alertsSubject.next(currentAlerts.filter(alert => alert.id !== id));
  }

  clear(): void {
    this.alertsSubject.next([]);
  }
}
