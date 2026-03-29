import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SidebarService } from '@app/services';
import { Subscription } from 'rxjs';
import {
  NavigationItem,
  NavigationItems,
} from '../../../models/navigation.model';
import { User } from '../../../models/user.model';
import { AuthService } from '../../../services/auth.service';
import { AlertService } from '../../../services/extras/alert.service';
import { AuthorizationService } from '../../../services/extras/authorization.service';
import { LanguageService } from '../../../services/extras/language.service';
import { NavigationService } from '../../../services/extras/navigation.service';
import { handleApiError } from '@app/utils';
import { ZardButtonComponent } from '../../../shared/components/button/button.component';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ConfirmationDialogComponent,
    ZardButtonComponent,
  ],
  template: `
    <header
      class="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-t border-b border-border bg-background px-4 shadow-sm"
    >
      <!-- Left side -->
      <div class="flex min-w-0 items-center gap-4">
        <button
          z-button
          zType="ghost"
          zSize="icon"
          type="button"
          (click)="toggleSidebar()"
          class="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Toggle sidebar"
        >
          <svg
            class="size-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <!-- Logo — visible only when desktop sidebar is collapsed -->
        <a
          *ngIf="desktopCollapsed"
          routerLink="/dashboard"
          class="hidden items-center gap-2 font-semibold text-foreground transition-opacity hover:opacity-80 md:flex"
        >
          <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          </div>
          <span class="text-base">eSTOCK</span>
        </a>

        <div class="h-6 w-px bg-border" aria-hidden="true"></div>

        <div
          class="relative w-full max-w-md min-w-0"
          data-topbar-search-root
          (keydown)="$event.stopPropagation()"
        >
          <div
            class="group flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-muted/30 px-3 text-muted-foreground transition-colors focus-within:border-ring focus-within:bg-background focus-within:text-foreground"
          >
            <svg
              class="size-4 shrink-0 text-muted-foreground transition-colors group-focus-within:text-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              #searchInput
              [(ngModel)]="searchQuery"
              class="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
              [placeholder]="t('search.placeholder')"
              type="search"
              (focus)="openSuggestions()"
              (input)="onSearchChange()"
              (keydown.enter)="goToFirstMatch()"
              (keydown.arrowdown)="moveActive(1)"
              (keydown.arrowup)="moveActive(-1)"
              (keydown.escape)="closeSuggestions()"
            />
            <kbd
              class="hidden shrink-0 rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block"
              aria-label="Shortcut"
              >&#8984; F</kbd
            >
          </div>
          <div
            *ngIf="showSuggestions"
            class="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-popover py-1 text-popover-foreground shadow-lg"
            data-topbar-search-suggestions
          >
            <ng-container *ngIf="filteredItems.length; else noResults">
              <ul class="max-h-64 overflow-auto">
                <li
                  *ngFor="let item of filteredItems; let i = index"
                  (click)="navigate(item)"
                  [class]="i === activeIndex ? 'bg-accent' : ''"
                  class="flex cursor-pointer items-center px-3 py-2 text-sm hover:bg-accent"
                >
                  <span class="text-foreground">{{ t(item.name) }}</span>
                  <span class="ml-auto text-xs text-muted-foreground">{{
                    item.href
                  }}</span>
                </li>
              </ul>
            </ng-container>
            <ng-template #noResults>
              <div class="px-3 py-2 text-sm text-muted-foreground">
                {{ t('search.no_results') }}
              </div>
            </ng-template>
          </div>
        </div>
      </div>

      <!-- Right side -->
      <div class="flex shrink-0 items-center gap-6">
        <div class="flex items-center gap-2">
          <a
            [routerLink]="['/gamification']"
            class="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            [title]="t('nav.rewards')"
            aria-label="Rewards"
          >
            <svg
              class="size-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
              />
            </svg>
          </a>
          <a
            [routerLink]="['/stock-alerts']"
            class="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            [title]="t('nav.notifications')"
            aria-label="Notifications"
          >
            <svg
              class="size-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </a>
          <a
            routerLink="/articles"
            class="inline-flex size-9 items-center justify-center rounded-full border border-border bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            [title]="t('nav.quick_add')"
            aria-label="Quick add"
          >
            <svg
              class="size-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </a>
        </div>

        <div class="h-8 w-px bg-border" aria-hidden="true"></div>

        <div class="user-menu-zone relative">
          <button
            z-button
            zType="ghost"
            type="button"
            (click)="userMenuOpen = !userMenuOpen"
            class="flex items-center gap-3 rounded-lg py-1.5 pl-1 pr-2 text-left transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
            aria-expanded="userMenuOpen"
            aria-haspopup="true"
          >
            <div
              class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground"
            >
              {{ getInitials(firstName, lastName) }}
            </div>
            <div class="hidden min-w-0 sm:block">
              <p
                class="truncate text-sm font-medium leading-tight text-foreground"
              >
                {{ fullName || t('nav.account') }}
              </p>
              <p class="truncate text-xs leading-tight text-muted-foreground">
                {{ userRoleLabel }}
              </p>
            </div>
          </button>
          <div
            *ngIf="userMenuOpen"
            class="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-border bg-popover py-1 shadow-lg"
          >
            <button
              z-button
              zType="ghost"
              type="button"
              (click)="openLogoutConfirm(); userMenuOpen = false"
              class="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <svg
                class="size-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              {{ t('nav.logout') }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Logout Confirmation Dialog -->
    <app-confirmation-dialog
      [isOpen]="isLogoutDialogOpen"
      [title]="t('confirm') || 'Confirmar'"
      [message]="t('auth.logout_confirm') || '¿Deseas cerrar sesión?'"
      [confirmText]="t('auth.logout') || t('confirm') || 'Confirmar'"
      (confirmed)="handleLogout()"
      (cancelled)="isLogoutDialogOpen = false"
    ></app-confirmation-dialog>
  `,
  styles: [],
})
export class TopbarComponent implements OnInit, OnDestroy {
  searchQuery = '';
  desktopCollapsed = false;
  user: User | null = null;
  items: NavigationItems = [];
  filteredItems: NavigationItem[] = [];
  showSuggestions = false;
  activeIndex = 0;
  private subs = new Subscription();

  // Display data from localStorage auth_estock
  fullName = '';
  firstName = '';
  lastName = '';
  userRoleLabel = '';
  isLogoutDialogOpen = false;
  userMenuOpen = false;

  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;

  constructor(
    private authService: AuthService,
    private alertService: AlertService,
    private languageService: LanguageService,
    private router: Router,
    private navigationService: NavigationService,
    private authorizationService: AuthorizationService,
    private sidebarService: SidebarService,
  ) {}

  toggleSidebar(): void {
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (isMobile) {
      this.sidebarService.toggleMobile();
      return;
    }
    this.sidebarService.toggleDesktop();
  }

  @HostListener('window:keydown', ['$event'])
  onGlobalKeyDown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 'f') {
      event.preventDefault();
      this.searchInputRef?.nativeElement?.focus();
    }
  }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.items = this.navigationService.getItems();
    this.subs.add(
      this.sidebarService.desktopCollapsed$.subscribe(c => (this.desktopCollapsed = c)),
    );
  }

  private loadCurrentUser(): void {
    // Subscribe to auth state changes
    this.subs.add(
      this.authService.authState$.subscribe((_authState: any) => {
        this.refreshUserDisplay();
      }),
    );
    // Initial load from localStorage
    this.refreshUserDisplay();
  }

  openLogoutConfirm(): void {
    this.isLogoutDialogOpen = true;
  }

  private refreshUserDisplay(): void {
    const stored = this.authorizationService.getCurrentUser() as any;
    let first = stored?.first_name || stored?.name || '';
    let last = stored?.last_name || '';

    // Fallbacks: derive missing parts from user_name in auth state or stored
    if (!first || !last) {
      const stateUser = this.authService.getCurrentUser() as any;
      const userName: string | undefined =
        stateUser?.user_name || stored?.user_name;
      if (userName) {
        const tokens = userName.trim().split(/\s+/);
        if (!first && tokens.length >= 1) first = tokens[0];
        if (!last && tokens.length >= 2) last = tokens[tokens.length - 1];
        if (!last && tokens.length === 1 && !first) first = userName;
      }
    }

    this.firstName = first;
    this.lastName = last;
    const parts = [first, last].filter(Boolean);
    this.fullName = parts.length ? parts.join(' ') : '';
    const storedRole = (stored as { role?: string })?.role;
    const stateUser = this.authService.getCurrentUser() as { role?: string } | null;
    const role = storedRole || stateUser?.role || '';
    this.userRoleLabel = role
      ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
      : 'eSTOCK';
  }

  getInitials(firstName?: string, lastName?: string): string {
    if (!firstName && !lastName) return 'U';
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  }

  async handleLogout(): Promise<void> {
    try {
      await this.authService.logout();

      this.alertService.success(
        this.t('auth.logout_success') || 'Sesión cerrada exitosamente',
        this.t('auth.goodbye') || 'Hasta luego',
      );

      // Navigate to login
      this.router.navigate(['/login']);
    } catch (error: any) {
      console.error('Logout error:', error);
      this.alertService.error(
        handleApiError(error, this.t('auth.logout_error') || 'Error al cerrar sesión'),
        this.t('auth.logout_failed') || 'Error',
      );
    }
  }

  t(key: string): string {
    return this.languageService.t(key);
  }

  onSearchChange(): void {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      this.filteredItems = [];
      this.showSuggestions = false;
      return;
    }

    // search by translated label and by route path
    this.filteredItems = this.items
      .filter((item) => {
        const translated = this.t(item.name).toLowerCase();
        const nameMatch = translated.includes(query);
        const routeMatch = item.href.toLowerCase().includes(query);
        return nameMatch || routeMatch;
      })
      .slice(0, 10);

    this.showSuggestions = this.filteredItems.length > 0;
    this.activeIndex = 0;
  }

  openSuggestions(): void {
    if (this.filteredItems.length === 0) {
      this.onSearchChange();
    }
    this.showSuggestions = this.filteredItems.length > 0;
  }

  closeSuggestions(): void {
    this.showSuggestions = false;
  }

  moveActive(delta: number): void {
    if (!this.showSuggestions || this.filteredItems.length === 0) return;
    const newIndex = this.activeIndex + delta;
    if (newIndex < 0) {
      this.activeIndex = this.filteredItems.length - 1;
    } else if (newIndex >= this.filteredItems.length) {
      this.activeIndex = 0;
    } else {
      this.activeIndex = newIndex;
    }
  }

  goToFirstMatch(): void {
    if (!this.filteredItems.length) return;
    const item = this.filteredItems[this.activeIndex] || this.filteredItems[0];
    this.navigate(item);
  }

  navigate(item: NavigationItem): void {
    this.router.navigate([item.href]);
    this.closeSuggestions();
    this.searchQuery = '';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const closestSearch = target.closest('[data-topbar-search-root]');
    if (!closestSearch) {
      this.closeSuggestions();
    }
    if (!target.closest('.user-menu-zone')) {
      this.userMenuOpen = false;
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
