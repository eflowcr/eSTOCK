import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MainLayoutComponent } from '@app/components/layout/main-layout.component';
import { NotificationsService } from '@app/services/notifications.service';
import { LanguageService } from '@app/services/extras/language.service';
import { AlertService } from '@app/services/extras/alert.service';
import { Notification, NotificationEventType, NotificationListFilters } from '@app/models/notification.model';
import { handleApiError } from '@app/utils';

const PAGE_SIZE = 20;

const RESOURCE_ROUTES: Record<string, string> = {
  picking_task: '/picking-tasks',
  receiving_task: '/receiving-tasks',
  stock_alert: '/stock-alerts',
  lot: '/lots',
};

function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `hace ${days}d`;
  return `hace ${Math.floor(days / 7)}sem`;
}

const EVENT_TYPE_OPTIONS: { value: NotificationEventType | ''; labelKey: string }[] = [
  { value: '', labelKey: 'notif.filter_all_types' },
  { value: 'task_assigned', labelKey: 'notif.event_task_assigned' },
  { value: 'task_completed', labelKey: 'notif.event_task_completed' },
  { value: 'lot_expiring_7d', labelKey: 'notif.event_lot_expiring_7d' },
  { value: 'lot_expiring_1d', labelKey: 'notif.event_lot_expiring_1d' },
  { value: 'low_stock', labelKey: 'notif.event_low_stock' },
  { value: 'user_welcome', labelKey: 'notif.event_user_welcome' },
];

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MainLayoutComponent],
  template: `
    <app-main-layout>
      <div class="space-y-5">

        <!-- Page header -->
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 class="text-2xl font-semibold text-foreground">{{ t('notif.page_title') }}</h1>
            <p class="mt-0.5 text-sm text-muted-foreground">{{ t('notif.page_subtitle') }}</p>
          </div>
          <button *ngIf="notifications.length > 0" type="button" (click)="markAllRead()"
            [disabled]="markingAll"
            class="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed">
            <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            {{ t('bell.mark_all_read') }}
          </button>
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap items-center gap-3">
          <!-- Read/Unread pills -->
          <div class="flex rounded-lg border border-border overflow-hidden">
            <button *ngFor="let opt of readFilterOptions" type="button"
              (click)="setReadFilter(opt.value)"
              class="px-3 py-1.5 text-sm font-medium transition-colors"
              [class.bg-primary]="readFilter === opt.value"
              [class.text-primary-foreground]="readFilter === opt.value"
              [class.bg-card]="readFilter !== opt.value"
              [class.text-muted-foreground]="readFilter !== opt.value"
              [class.hover:bg-accent]="readFilter !== opt.value">
              {{ t(opt.labelKey) }}
            </button>
          </div>

          <!-- Event type dropdown -->
          <select [(ngModel)]="eventTypeFilter" (ngModelChange)="onFilterChange()"
            class="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option *ngFor="let opt of eventTypeOptions" [value]="opt.value">{{ t(opt.labelKey) }}</option>
          </select>

          <!-- Date from -->
          <input type="date" [(ngModel)]="fromDate" (ngModelChange)="onFilterChange()"
            [placeholder]="t('notif.filter_from')"
            class="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">

          <!-- Date to -->
          <input type="date" [(ngModel)]="toDate" (ngModelChange)="onFilterChange()"
            [placeholder]="t('notif.filter_to')"
            class="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">

          <!-- Clear filters -->
          <button *ngIf="hasActiveFilters" type="button" (click)="clearFilters()"
            class="text-xs text-muted-foreground hover:text-foreground hover:underline">
            {{ t('notif.clear_filters') }}
          </button>
        </div>

        <!-- Loading -->
        <div *ngIf="loading" class="flex items-center justify-center py-16">
          <svg class="size-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>

        <!-- Empty state -->
        <div *ngIf="!loading && notifications.length === 0"
          class="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
          <svg class="size-12 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.25"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
          <p class="text-sm font-medium text-muted-foreground">{{ t('notif.empty_title') }}</p>
          <p class="text-xs text-muted-foreground/70">{{ t('notif.empty_subtitle') }}</p>
        </div>

        <!-- Notification list -->
        <div *ngIf="!loading && notifications.length > 0"
          class="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border shadow-sm">
          <div *ngFor="let notif of notifications"
            (click)="onItemClick(notif)"
            [ngClass]="['flex cursor-pointer items-start gap-4 px-5 py-4 hover:bg-accent transition-colors', !notif.is_read ? 'bg-accent' : '']">

            <!-- Unread dot -->
            <div class="mt-1.5 shrink-0">
              <span *ngIf="!notif.is_read"
                class="block size-2 rounded-full bg-primary"></span>
              <span *ngIf="notif.is_read"
                class="block size-2 rounded-full bg-transparent border border-border"></span>
            </div>

            <!-- Content -->
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <p class="text-sm text-foreground"
                  [class.font-semibold]="!notif.is_read"
                  [class.font-normal]="notif.is_read">
                  {{ notif.title }}
                </p>
                <span class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                  [ngClass]="eventTypeBadgeClass(notif.event_type)">
                  {{ t('notif.event_' + notif.event_type) }}
                </span>
              </div>
              <p *ngIf="notif.body" class="mt-0.5 text-xs text-muted-foreground line-clamp-2">{{ notif.body }}</p>
            </div>

            <!-- Time -->
            <span class="shrink-0 text-[11px] text-muted-foreground">{{ relativeTime(notif.created_at) }}</span>
          </div>
        </div>

        <!-- Pagination -->
        <div *ngIf="!loading && totalPages > 1" class="flex items-center justify-center gap-2">
          <button type="button" (click)="prevPage()" [disabled]="currentPage === 0"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-sm text-foreground transition-colors hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed">
            <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <span class="text-sm text-muted-foreground">
            {{ currentPage + 1 }} / {{ totalPages }}
          </span>
          <button type="button" (click)="nextPage()" [disabled]="currentPage >= totalPages - 1"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-sm text-foreground transition-colors hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed">
            <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

      </div>
    </app-main-layout>
  `,
})
export class NotificationsPageComponent implements OnInit {
  notifications: Notification[] = [];
  loading = false;
  markingAll = false;
  currentPage = 0;
  totalPages = 1;

  readFilter: 'all' | 'unread' | 'read' = 'all';
  eventTypeFilter: NotificationEventType | '' = '';
  fromDate = '';
  toDate = '';

  readonly readFilterOptions = [
    { value: 'all' as const, labelKey: 'notif.filter_all' },
    { value: 'unread' as const, labelKey: 'notif.filter_unread' },
    { value: 'read' as const, labelKey: 'notif.filter_read' },
  ];

  readonly eventTypeOptions = EVENT_TYPE_OPTIONS;

  get hasActiveFilters(): boolean {
    return this.readFilter !== 'all' || !!this.eventTypeFilter || !!this.fromDate || !!this.toDate;
  }

  constructor(
    private notificationsService: NotificationsService,
    private languageService: LanguageService,
    private alertService: AlertService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    try {
      const filters: NotificationListFilters = {
        limit: PAGE_SIZE,
        offset: this.currentPage * PAGE_SIZE,
      };
      if (this.readFilter === 'unread') filters.unread = true;
      if (this.eventTypeFilter) filters.event_type = this.eventTypeFilter as NotificationEventType;
      if (this.fromDate) filters.from = this.fromDate;
      if (this.toDate) filters.to = this.toDate;

      const res = await this.notificationsService.list(filters);
      this.notifications = res.data ?? [];
      // Server doesn't return total — estimate pages from returned count
      this.totalPages = this.notifications.length < PAGE_SIZE
        ? Math.max(this.currentPage + 1, 1)
        : this.currentPage + 2;
    } catch (err: any) {
      this.alertService.error(handleApiError(err, this.t('notif.load_error')), this.t('error'));
    } finally {
      this.loading = false;
    }
  }

  setReadFilter(value: 'all' | 'unread' | 'read'): void {
    this.readFilter = value;
    this.currentPage = 0;
    this.load();
  }

  onFilterChange(): void {
    this.currentPage = 0;
    this.load();
  }

  clearFilters(): void {
    this.readFilter = 'all';
    this.eventTypeFilter = '';
    this.fromDate = '';
    this.toDate = '';
    this.currentPage = 0;
    this.load();
  }

  prevPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.load();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.load();
    }
  }

  async onItemClick(notif: Notification): Promise<void> {
    if (!notif.is_read) {
      try {
        await this.notificationsService.markRead(notif.id);
        notif.is_read = true;
      } catch {
        // silent
      }
    }
    this.navigateToResource(notif);
  }

  async markAllRead(): Promise<void> {
    this.markingAll = true;
    try {
      await this.notificationsService.markAllRead();
      this.notifications.forEach(n => (n.is_read = true));
      this.alertService.success(this.t('notif.marked_all_read'), this.t('success'));
    } catch (err: any) {
      this.alertService.error(handleApiError(err, this.t('notif.mark_all_error')), this.t('error'));
    } finally {
      this.markingAll = false;
    }
  }

  private navigateToResource(notif: Notification): void {
    if (!notif.resource_type) return;
    const base = RESOURCE_ROUTES[notif.resource_type];
    if (!base) return;
    const path = notif.resource_id ? [base, notif.resource_id] : [base];
    try {
      this.router.navigate(path);
    } catch (e) {
      console.warn('[NotificationsPage] navigation failed', e);
    }
  }

  relativeTime(isoDate: string): string {
    return formatRelativeTime(isoDate);
  }

  eventTypeBadgeClass(eventType: string): string {
    const map: Record<string, string> = {
      task_assigned: 'bg-blue-500/10 text-blue-600',
      task_completed: 'bg-emerald-500/10 text-emerald-600',
      lot_expiring_7d: 'bg-amber-500/10 text-amber-600',
      lot_expiring_1d: 'bg-red-500/10 text-red-600',
      low_stock: 'bg-orange-500/10 text-orange-600',
      user_welcome: 'bg-violet-500/10 text-violet-600',
    };
    return map[eventType] ?? 'bg-muted text-muted-foreground';
  }

  t(key: string): string {
    return this.languageService.t(key);
  }
}
