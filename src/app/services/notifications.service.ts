import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { Notification, NotificationListFilters, NotificationPreference } from '@app/models/notification.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/notifications';
export const NOTIFICATIONS_URL = returnCompleteURI({
  URI: environment.API.BASE,
  API_Gateway: GATEWAY,
});

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  unreadCount = 0;

  private _pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private fetchService: FetchService) {}

  async list(filters?: NotificationListFilters): Promise<ApiResponse<Notification[]>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params.append(k, String(v));
        }
      });
    }
    const qs = params.toString();
    return this.fetchService.get<ApiResponse<Notification[]>>({
      API_Gateway: qs ? `${NOTIFICATIONS_URL}?${qs}` : NOTIFICATIONS_URL,
    });
  }

  async countUnread(): Promise<number> {
    const res = await this.fetchService.get<ApiResponse<{ count: number }>>({
      API_Gateway: `${NOTIFICATIONS_URL}/count`,
    });
    return res.data?.count ?? 0;
  }

  async markRead(id: string): Promise<ApiResponse<void>> {
    return this.fetchService.patch<ApiResponse<void>>({
      API_Gateway: `${NOTIFICATIONS_URL}/${id}/read`,
      values: {},
    });
  }

  async markAllRead(): Promise<ApiResponse<void>> {
    return this.fetchService.patch<ApiResponse<void>>({
      API_Gateway: `${NOTIFICATIONS_URL}/mark-all-read`,
      values: {},
    });
  }

  async getPreferences(): Promise<ApiResponse<NotificationPreference[]>> {
    return this.fetchService.get<ApiResponse<NotificationPreference[]>>({
      API_Gateway: `${NOTIFICATIONS_URL}/preferences`,
    });
  }

  async upsertPreferences(prefs: NotificationPreference[]): Promise<ApiResponse<void>> {
    return this.fetchService.post<ApiResponse<void>>({
      API_Gateway: `${NOTIFICATIONS_URL}/preferences`,
      values: prefs,
    });
  }

  // Polling helper — W6-B bell icon calls startPolling() in ngOnInit.
  // Stores latest count in `unreadCount` property; component reads it via interval or ngDoCheck.
  startPolling(intervalMs = 60000): void {
    if (this._pollInterval) return;
    this.countUnread().then(n => { this.unreadCount = n; });
    this._pollInterval = setInterval(async () => {
      this.unreadCount = await this.countUnread();
    }, intervalMs);
  }

  stopPolling(): void {
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = null;
    }
  }
}
