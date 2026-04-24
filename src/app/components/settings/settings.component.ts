import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MainLayoutComponent } from '@app/components/layout/main-layout.component';
import { LanguageService } from '@app/services/extras/language.service';
import { ThemeService } from '@app/services/extras/theme.service';
import { UserPreferencesService } from '@app/services/user-preferences.service';
import { AuthService } from '@app/services/auth.service';
import { AlertService } from '@app/services/extras/alert.service';
import { AuthorizationService } from '@app/services/extras/authorization.service';
import { AppTheme, AppLanguage, UserPreferences, DEFAULT_PREFERENCES } from '@app/models/user-preferences.model';
import { handleApiError } from '@app/utils';
import { NotificationsService } from '@app/services/notifications.service';
import { NotificationPreference, NotificationEventType } from '@app/models/notification.model';

const EVENT_TYPES: { key: NotificationEventType; labelKey: string }[] = [
  { key: 'task_assigned', labelKey: 'notif.event_task_assigned' },
  { key: 'task_completed', labelKey: 'notif.event_task_completed' },
  { key: 'lot_expiring_7d', labelKey: 'notif.event_lot_expiring_7d' },
  { key: 'lot_expiring_1d', labelKey: 'notif.event_lot_expiring_1d' },
  { key: 'low_stock', labelKey: 'notif.event_low_stock' },
  { key: 'user_welcome', labelKey: 'notif.event_user_welcome' },
];

interface PrefRow {
  event_type: NotificationEventType;
  in_app: boolean;
  email: boolean;
  push: boolean;
}

type SettingsTab = 'profile' | 'appearance' | 'notifications' | 'system' | 'billing';

interface SettingCard {
  titleKey: string;
  descriptionKey: string;
  href: string;
  iconPath: string;
  accent: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MainLayoutComponent],
  template: `
    <app-main-layout>
      <div class="mx-auto max-w-3xl space-y-6">

        <!-- Page header -->
        <div>
          <h1 class="text-2xl font-semibold text-foreground">{{ t('settings') }}</h1>
          <p class="mt-0.5 text-sm text-muted-foreground">{{ t('settings_description') }}</p>
        </div>

        <!-- Tab navigation -->
        <div class="border-b border-border">
          <nav class="flex gap-0 -mb-px overflow-x-auto">
            <button *ngFor="let tab of visibleTabs" type="button"
              (click)="activeTab.set(tab.id)"
              class="flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors duration-150"
              [class.border-primary]="activeTab() === tab.id"
              [class.text-primary]="activeTab() === tab.id"
              [class.border-transparent]="activeTab() !== tab.id"
              [class.text-muted-foreground]="activeTab() !== tab.id">
              <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="tab.icon"/>
              </svg>
              {{ t(tab.labelKey) }}
            </button>
          </nav>
        </div>

        <!-- ── PROFILE tab ─────────────────────────────────── -->
        <div *ngIf="activeTab() === 'profile'" class="space-y-6">
          <div class="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div class="flex items-center gap-5">
              <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                {{ userInitials }}
              </div>
              <div class="min-w-0">
                <p class="text-lg font-semibold text-foreground truncate">{{ userName }}</p>
                <p class="text-sm text-muted-foreground truncate">{{ userEmail }}</p>
              </div>
            </div>
          </div>

          <!-- Account info rows -->
          <div class="rounded-xl border border-border bg-card shadow-sm divide-y divide-border overflow-hidden">
            <div class="flex items-center justify-between px-5 py-4">
              <div class="flex items-center gap-3">
                <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                  <svg class="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-medium text-foreground">{{ t('settings.account_status') }}</p>
                  <p class="text-xs text-muted-foreground">{{ t('settings.account_active_desc') }}</p>
                </div>
              </div>
              <span class="text-xs font-semibold text-emerald-600">{{ t('settings.active') }}</span>
            </div>
            <div class="flex items-center justify-between px-5 py-4">
              <div class="flex items-center gap-3">
                <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                  <svg class="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-medium text-foreground">{{ t('settings.email') }}</p>
                  <p class="text-xs text-muted-foreground">{{ userEmail }}</p>
                </div>
              </div>
              <span class="text-xs text-muted-foreground">{{ t('settings.verified') }}</span>
            </div>
          </div>
        </div>

        <!-- ── APPEARANCE tab ──────────────────────────────── -->
        <div *ngIf="activeTab() === 'appearance'" class="space-y-6">

          <!-- Theme -->
          <div class="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div>
              <p class="text-sm font-semibold text-foreground">{{ t('settings.theme') }}</p>
              <p class="text-xs text-muted-foreground mt-0.5">{{ t('settings.theme_hint') }}</p>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <button *ngFor="let opt of themeOptions" type="button"
                (click)="setTheme(opt.value)"
                [ngClass]="themeButtonClass(opt.value)">
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" [attr.d]="opt.icon"/>
                </svg>
                <span>{{ t(opt.labelKey) }}</span>
                <span class="h-1.5 w-1.5 rounded-full transition-opacity"
                  [class.bg-primary]="prefs().theme === opt.value"
                  [class.opacity-100]="prefs().theme === opt.value"
                  [class.opacity-0]="prefs().theme !== opt.value"></span>
              </button>
            </div>
          </div>

          <!-- Language -->
          <div class="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div>
              <p class="text-sm font-semibold text-foreground">{{ t('settings.language') }}</p>
              <p class="text-xs text-muted-foreground mt-0.5">{{ t('settings.language_hint') }}</p>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <button *ngFor="let opt of languageOptions" type="button"
                (click)="setLanguage(opt.value)"
                [ngClass]="langButtonClass(opt.value)">
                <span class="text-lg">{{ opt.flag }}</span>
                <span class="font-medium">{{ opt.label }}</span>
                <svg *ngIf="prefs().language === opt.value"
                  class="ml-auto h-4 w-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="flex justify-end">
            <ng-container *ngTemplateOutlet="saveBtn"></ng-container>
          </div>
        </div>

        <!-- ── NOTIFICATIONS tab ───────────────────────────── -->
        <div *ngIf="activeTab() === 'notifications'" class="space-y-6">

          <!-- Global toggles (user-prefs: email/push/marketing) -->
          <div class="rounded-xl border border-border bg-card shadow-sm overflow-hidden divide-y divide-border">
            <div *ngFor="let notif of notifOptions"
              class="flex items-center justify-between px-5 py-4 hover:bg-accent transition-colors">
              <div class="min-w-0 mr-6">
                <p class="text-sm font-medium text-foreground">{{ t(notif.labelKey) }}</p>
                <p class="text-xs text-muted-foreground mt-0.5">{{ t(notif.hintKey) }}</p>
              </div>
              <button type="button" (click)="toggleNotification(notif.key)"
                class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                [class.bg-primary]="getNotifValue(notif.key)"
                [class.bg-muted]="!getNotifValue(notif.key)">
                <span class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out"
                  [class.translate-x-5]="getNotifValue(notif.key)"
                  [class.translate-x-0]="!getNotifValue(notif.key)"></span>
              </button>
            </div>
          </div>

          <div class="flex justify-end">
            <ng-container *ngTemplateOutlet="saveBtn"></ng-container>
          </div>

          <!-- Per-event preferences matrix -->
          <div>
            <div class="mb-3">
              <p class="text-sm font-semibold text-foreground">{{ t('notif.prefs_title') }}</p>
              <p class="text-xs text-muted-foreground mt-0.5">{{ t('notif.prefs_subtitle') }}</p>
            </div>

            <div *ngIf="prefsLoading" class="flex items-center justify-center py-8">
              <svg class="size-5 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>

            <div *ngIf="!prefsLoading" class="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
              <table class="w-full min-w-[420px] text-sm">
                <thead>
                  <tr class="border-b border-border bg-muted/40">
                    <th class="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-full">{{ t('notif.prefs_event') }}</th>
                    <th class="px-4 py-3 text-center text-xs font-semibold text-muted-foreground whitespace-nowrap">{{ t('notif.prefs_in_app') }}</th>
                    <th class="px-4 py-3 text-center text-xs font-semibold text-muted-foreground whitespace-nowrap">{{ t('notif.prefs_email') }}</th>
                    <th class="px-4 py-3 text-center text-xs font-semibold text-muted-foreground whitespace-nowrap">
                      <span [title]="t('notif.prefs_push_disabled')" class="flex items-center justify-center gap-1 opacity-40 cursor-not-allowed">
                        {{ t('notif.prefs_push') }}
                        <svg class="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                        </svg>
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border">
                  <tr *ngFor="let row of prefRows" class="hover:bg-accent/40 transition-colors">
                    <td class="px-4 py-3 text-foreground font-medium">{{ t('notif.event_' + row.event_type) }}</td>
                    <td class="px-4 py-3 text-center">
                      <input type="checkbox" [(ngModel)]="row.in_app"
                        class="size-4 rounded border-border text-primary accent-primary cursor-pointer">
                    </td>
                    <td class="px-4 py-3 text-center">
                      <input type="checkbox" [(ngModel)]="row.email"
                        class="size-4 rounded border-border text-primary accent-primary cursor-pointer">
                    </td>
                    <td class="px-4 py-3 text-center">
                      <input type="checkbox" [ngModel]="row.push" disabled
                        class="size-4 rounded border-border opacity-30 cursor-not-allowed">
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="mt-3 flex items-center justify-end gap-3">
              <p *ngIf="prefsSavedOk" class="text-xs text-emerald-600 flex items-center gap-1">
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                </svg>
                {{ t('settings.saved') }}
              </p>
              <button type="button" (click)="savePrefs()" [disabled]="prefsSaving"
                class="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed">
                <svg *ngIf="prefsSaving" class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {{ prefsSaving ? t('settings.saving') : t('settings.save') }}
              </button>
            </div>
          </div>

        </div>

        <!-- ── BILLING tab ────────────────────────────────── -->
        <div *ngIf="activeTab() === 'billing'" class="space-y-4">
          <div class="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col items-start gap-4">
            <p class="text-sm text-muted-foreground">{{ t('billing.subtitle') }}</p>
            <a routerLink="/settings/billing"
              class="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.97]">
              <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
              </svg>
              {{ t('billing.title') }}
            </a>
          </div>
        </div>

        <!-- ── SYSTEM tab (admin only) ─────────────────────── -->
        <div *ngIf="activeTab() === 'system'">
          <!-- Same container style as Notifications -->
          <div class="rounded-xl border border-border bg-card shadow-sm overflow-hidden divide-y divide-border">
            <a *ngFor="let card of systemCards" [routerLink]="card.href"
              class="group flex items-center gap-4 px-5 py-4 hover:bg-accent transition-colors duration-150">
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                [style.background]="card.accent + '18'">
                <svg class="h-4 w-4" [style.color]="card.accent"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="card.iconPath"/>
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-foreground">{{ t(card.titleKey) }}</p>
                <p class="text-xs text-muted-foreground mt-0.5">{{ t(card.descriptionKey) }}</p>
              </div>
              <svg class="h-4 w-4 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-primary"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 18l6-6-6-6"/>
              </svg>
            </a>
          </div>
        </div>

      </div>

      <!-- Save button template -->
      <ng-template #saveBtn>
        <div class="flex items-center gap-3">
          <p *ngIf="savedOk()" class="text-xs text-emerald-600 flex items-center gap-1">
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
            </svg>
            {{ t('settings.saved') }}
          </p>
          <button type="button" (click)="save()" [disabled]="saving()"
            class="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed">
            <svg *ngIf="saving()" class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {{ saving() ? t('settings.saving') : t('settings.save') }}
          </button>
        </div>
      </ng-template>

    </app-main-layout>
  `,
})
export class SettingsComponent implements OnInit {
  prefs = signal<UserPreferences>(DEFAULT_PREFERENCES);
  saving = signal(false);
  savedOk = signal(false);
  activeTab = signal<SettingsTab>('profile');

  // Per-event preferences matrix (FN3)
  prefRows: PrefRow[] = [];
  prefsLoading = false;
  prefsSaving = false;
  prefsSavedOk = false;

  readonly allTabs: { id: SettingsTab; labelKey: string; icon: string; adminOnly?: boolean }[] = [
    {
      id: 'profile',
      labelKey: 'settings.tab_profile',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    },
    {
      id: 'appearance',
      labelKey: 'settings.tab_appearance',
      icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
    },
    {
      id: 'notifications',
      labelKey: 'settings.tab_notifications',
      icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    },
    {
      id: 'system',
      labelKey: 'settings.tab_system',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      adminOnly: true,
    },
    {
      id: 'billing',
      labelKey: 'billing.title',
      icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    },
  ];

  get visibleTabs() {
    return this.allTabs.filter(t => !t.adminOnly || this.authzService.isAdmin());
  }

  readonly themeOptions: { value: AppTheme; labelKey: string; icon: string }[] = [
    {
      value: 'light',
      labelKey: 'settings.theme_light',
      icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
    },
    {
      value: 'dark',
      labelKey: 'settings.theme_dark',
      icon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
    },
    {
      value: 'system',
      labelKey: 'settings.theme_system',
      icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    },
  ];

  readonly languageOptions: { value: AppLanguage; label: string; flag: string }[] = [
    { value: 'es', label: 'Español', flag: '🇪🇸' },
    { value: 'en', label: 'English', flag: '🇺🇸' },
  ];

  readonly notifOptions: { key: 'email' | 'push' | 'marketing'; labelKey: string; hintKey: string }[] = [
    { key: 'email', labelKey: 'settings.notif_email', hintKey: 'settings.notif_email_hint' },
    { key: 'push', labelKey: 'settings.notif_push', hintKey: 'settings.notif_push_hint' },
    { key: 'marketing', labelKey: 'settings.notif_marketing', hintKey: 'settings.notif_marketing_hint' },
  ];

  readonly systemCards: SettingCard[] = [
    { titleKey: 'location_types', descriptionKey: 'settings.location_types_desc', href: '/location-types', iconPath: 'M2.25 12l9.75 4.5 9.75-4.5-9.75-4.5L2.25 12zm0 4.5l9.75 4.5 9.75-4.5-9.75-4.5-9.75 4.5z', accent: '#3b82f6' },
    { titleKey: 'presentation_types', descriptionKey: 'settings.presentation_types_desc', href: '/presentation-types', iconPath: 'M20 7l-8 4-8-4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', accent: '#8b5cf6' },
    { titleKey: 'roles', descriptionKey: 'settings.roles_desc', href: '/roles', iconPath: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', accent: '#10b981' },
  ];

  get isAdmin(): boolean { return this.authzService.isAdmin(); }

  get userName(): string { return this.authService.getCurrentUser()?.user_name ?? '—'; }
  get userEmail(): string { return this.authService.getCurrentUser()?.email ?? ''; }
  get userRole(): string { const r = this.authService.getCurrentUser()?.role ?? ''; return this.t(r) || r; }
  get userInitials(): string {
    return this.userName.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?';
  }

  constructor(
    private languageService: LanguageService,
    private themeService: ThemeService,
    private prefsService: UserPreferencesService,
    private authService: AuthService,
    private authzService: AuthorizationService,
    private alertService: AlertService,
    private notificationsService: NotificationsService,
  ) {}

  ngOnInit(): void {
    this.prefsService.prefs$.subscribe(p => this.prefs.set({ ...p }));
    this.prefsService.load();
    this.loadNotifPrefs();
  }

  private async loadNotifPrefs(): Promise<void> {
    this.prefsLoading = true;
    try {
      const res = await this.notificationsService.getPreferences();
      const saved = res.data ?? [];
      this.prefRows = EVENT_TYPES.map(et => {
        const match = saved.find((p: NotificationPreference) => p.event_type === et.key);
        return {
          event_type: et.key,
          in_app: match?.in_app ?? true,
          email: match?.email ?? true,
          push: false,
        };
      });
    } catch {
      this.prefRows = EVENT_TYPES.map(et => ({ event_type: et.key, in_app: true, email: true, push: false }));
    } finally {
      this.prefsLoading = false;
    }
  }

  async savePrefs(): Promise<void> {
    this.prefsSaving = true;
    this.prefsSavedOk = false;
    try {
      await this.notificationsService.upsertPreferences(
        this.prefRows.map(r => ({ event_type: r.event_type, in_app: r.in_app, email: r.email, push: r.push }))
      );
      this.prefsSavedOk = true;
      setTimeout(() => (this.prefsSavedOk = false), 3000);
    } catch (err: any) {
      this.alertService.error(handleApiError(err, this.t('notif.prefs_save_error')), this.t('error'));
    } finally {
      this.prefsSaving = false;
    }
  }

  t(key: string): string { return this.languageService.t(key); }

  themeButtonClass(value: AppTheme): string {
    const base = 'flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 text-xs font-medium transition-all duration-150 active:scale-[0.97] cursor-pointer';
    return this.prefs().theme === value
      ? `${base} border-primary bg-accent text-primary`
      : `${base} border-border text-muted-foreground hover:border-muted-foreground/40`;
  }

  langButtonClass(value: AppLanguage): string {
    const base = 'flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all duration-150 active:scale-[0.97] cursor-pointer';
    return this.prefs().language === value
      ? `${base} border-primary bg-accent text-primary`
      : `${base} border-border text-muted-foreground hover:border-muted-foreground/40`;
  }

  getNotifValue(key: 'email' | 'push' | 'marketing'): boolean {
    return this.prefs().notifications[key];
  }

  setTheme(theme: AppTheme): void {
    this.prefs.update(p => ({ ...p, theme }));
    this.themeService.apply(theme);
  }

  setLanguage(lang: AppLanguage): void {
    this.prefs.update(p => ({ ...p, language: lang }));
    this.languageService.setLanguage(lang);
  }

  toggleNotification(key: 'email' | 'push' | 'marketing'): void {
    this.prefs.update(p => ({
      ...p,
      notifications: { ...p.notifications, [key]: !p.notifications[key] },
    }));
  }

  async save(): Promise<void> {
    this.saving.set(true);
    this.savedOk.set(false);
    try {
      await this.prefsService.save(this.prefs());
      this.savedOk.set(true);
      setTimeout(() => this.savedOk.set(false), 3000);
    } catch (err: any) {
      this.alertService.error(handleApiError(err, this.t('settings.save_error')), this.t('error'));
    } finally {
      this.saving.set(false);
    }
  }
}
