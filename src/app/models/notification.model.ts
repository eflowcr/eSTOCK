export type NotificationEventType =
  | 'task_assigned' | 'task_completed'
  | 'lot_expiring_7d' | 'lot_expiring_1d'
  | 'low_stock' | 'user_welcome'
  | (string & {});  // future-proof

export type NotificationChannel = 'in_app' | 'email' | 'push';

export interface Notification {
  id: string;
  user_id: string;
  event_type: NotificationEventType;
  title: string;
  body?: string;
  resource_type?: string;
  resource_id?: string;
  channels: string;  // comma-separated
  is_read: boolean;
  read_at?: string;
  sent_email_at?: string;
  created_at: string;
}

export interface NotificationPreference {
  user_id: string;
  event_type: NotificationEventType;
  in_app: boolean;
  email: boolean;
  push: boolean;
  updated_at: string;
}

export interface NotificationListFilters {
  unread?: boolean;
  event_type?: NotificationEventType;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}
