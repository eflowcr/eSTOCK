import { Injectable } from '@angular/core';
import { toast } from 'ngx-sonner';

export interface Alert {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number; // milliseconds, 0 = no auto-dismiss
  dismissible?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AlertService {
  private static readonly GENERIC_LABELS = new Set([
    'success',
    'error',
    'warning',
    'info',
    'confirm',
    'confirmed',
    'failed',
    'exito',
    'éxito',
  ]);

  private normalizeToastContent(
    message: string,
    title?: string,
  ): { title: string; description?: string } {
    if (!title) {
      return { title: message };
    }

    const messageIsGeneric = this.isGenericLabel(message);
    const titleIsGeneric = this.isGenericLabel(title);

    // Common case in current app: success('Success', 'Entity created')
    if (messageIsGeneric && !titleIsGeneric) {
      return { title: message, description: title };
    }

    // Default expected order: success('Entity created', 'Success')
    return { title, description: message };
  }

  private isGenericLabel(value: string): boolean {
    const normalized = value.trim().toLowerCase();
    return (
      AlertService.GENERIC_LABELS.has(normalized) || normalized.length <= 12
    );
  }

  private show(
    type: Alert['type'],
    message: string,
    title?: string,
    options?: Partial<Alert>,
  ): void {
    const defaultDurations: Record<Alert['type'], number> = {
      success: 2500,
      info: 3500,
      warning: 4000,
      error: 5000,
    };

    const normalized = this.normalizeToastContent(
      message,
      title ?? options?.title,
    );

    const payload = {
      description: normalized.description,
      duration: options?.duration ?? defaultDurations[type],
      dismissible: options?.dismissible ?? true,
      important: type === 'error' || type === 'warning',
    };

    switch (type) {
      case 'success':
        toast.success(normalized.title, payload);
        break;
      case 'error':
        toast.error(normalized.title, payload);
        break;
      case 'warning':
        toast.warning(normalized.title, payload);
        break;
      case 'info':
      default:
        toast.info(normalized.title, payload);
        break;
    }
  }

  success(message: string, title?: string, options?: Partial<Alert>): void {
    this.show('success', message, title, options);
  }

  error(message: string, title?: string, options?: Partial<Alert>): void {
    this.show('error', message, title, options);
  }

  warning(message: string, title?: string, options?: Partial<Alert>): void {
    this.show('warning', message, title, options);
  }

  info(message: string, title?: string, options?: Partial<Alert>): void {
    this.show('info', message, title, options);
  }

  dismiss(id: string): void {
    toast.dismiss(id);
  }

  clear(): void {
    toast.dismiss();
  }
}
