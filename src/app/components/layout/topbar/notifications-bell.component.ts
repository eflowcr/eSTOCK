import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { NotificationsService } from '@app/services/notifications.service';
import { LanguageService } from '@app/services/extras/language.service';
import { Notification } from '@app/models/notification.model';
import { RelativeDatePipe } from '@app/shared/pipes/relative-date.pipe';

const RESOURCE_ROUTES: Record<string, string> = {
  picking_task: '/picking-tasks',
  receiving_task: '/receiving-tasks',
  stock_alert: '/stock-alerts',
  lot: '/lots',
};

@Component({
  selector: 'app-notifications-bell',
  standalone: true,
  imports: [CommonModule, RouterModule, RelativeDatePipe],
  template: `
    <div class="notifications-bell-zone relative">
      <!-- Bell button -->
      <button
        type="button"
        (click)="toggleDropdown()"
        class="relative inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        [attr.aria-label]="t('bell.aria_label')"
        [attr.aria-expanded]="dropdownOpen"
      >
        <!-- Bell SVG -->
        <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        <!-- Unread badge -->
        <span *ngIf="unreadCount > 0"
          class="absolute -right-0.5 -top-0.5 flex min-w-[1.125rem] items-center justify-center rounded-full bg-red-500 px-1 py-0.5 text-[10px] font-bold leading-none text-white">
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </button>

      <!-- Dropdown panel -->
      <div *ngIf="dropdownOpen"
        class="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">

        <!-- Header -->
        <div class="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span class="text-sm font-semibold text-foreground">{{ t('bell.title') }}</span>
          <button *ngIf="notifications.length > 0" type="button"
            (click)="markAllRead()"
            class="text-xs text-primary hover:underline focus:outline-none">
            {{ t('bell.mark_all_read') }}
          </button>
        </div>

        <!-- Notification list -->
        <ul *ngIf="notifications.length > 0; else emptyState" class="max-h-80 divide-y divide-border overflow-y-auto">
          <li *ngFor="let notif of notifications"
            (click)="onItemClick(notif)"
            [ngClass]="['flex cursor-pointer flex-col gap-0.5 px-4 py-3 hover:bg-accent transition-colors', !notif.is_read ? 'bg-accent' : '']">
            <div class="flex items-start justify-between gap-2">
              <span class="text-sm leading-snug text-foreground"
                [class.font-semibold]="!notif.is_read"
                [class.font-normal]="notif.is_read">
                {{ notif.title }}
              </span>
              <span class="shrink-0 text-[10px] text-muted-foreground">{{ notif.created_at | relativeDate }}</span>
            </div>
            <p *ngIf="notif.body" class="text-xs text-muted-foreground line-clamp-2">
              {{ truncate(notif.body, 80) }}
            </p>
          </li>
        </ul>

        <ng-template #emptyState>
          <div class="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <svg class="size-8 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
            <p class="text-sm text-muted-foreground">{{ t('bell.empty') }}</p>
          </div>
        </ng-template>

        <!-- Footer -->
        <div class="border-t border-border px-4 py-2.5">
          <a routerLink="/notifications" (click)="dropdownOpen = false"
            class="block w-full text-center text-xs font-medium text-primary hover:underline focus:outline-none">
            {{ t('bell.view_all') }}
          </a>
        </div>
      </div>
    </div>
  `,
})
export class NotificationsBellComponent implements OnInit, OnDestroy {
  unreadCount = 0;
  notifications: Notification[] = [];
  dropdownOpen = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private notificationsService: NotificationsService,
    private languageService: LanguageService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.refresh();
    this.intervalId = setInterval(() => this.refresh(), 60000);
  }

  ngOnDestroy(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
    if (this.dropdownOpen) this.refresh();
  }

  async refresh(): Promise<void> {
    try {
      this.unreadCount = await this.notificationsService.countUnread();
      const res = await this.notificationsService.list({ limit: 10 });
      this.notifications = res.data ?? [];
    } catch {
      // silent — bell should never crash the app
    }
  }

  async onItemClick(notif: Notification): Promise<void> {
    if (!notif.is_read) {
      try {
        await this.notificationsService.markRead(notif.id);
        notif.is_read = true;
        if (this.unreadCount > 0) this.unreadCount--;
      } catch {
        // silent
      }
    }
    this.dropdownOpen = false;
    this.navigateToResource(notif);
  }

  async markAllRead(): Promise<void> {
    try {
      await this.notificationsService.markAllRead();
      this.notifications.forEach(n => (n.is_read = true));
      this.unreadCount = 0;
    } catch {
      // silent
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
      console.warn('[NotificationsBell] navigation failed', e);
    }
  }

  truncate(text: string, maxLen: number): string {
    return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
  }

  t(key: string): string {
    return this.languageService.t(key);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notifications-bell-zone')) {
      this.dropdownOpen = false;
    }
  }
}
