import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AlertService } from '../../../services/extras/alert.service';
import { LanguageService } from '../../../services/extras/language.service';
import { User } from '../../../models/user.model';
import { NavigationItem, NavigationItems } from '../../../models/navigation.model';
import { NavigationService } from '../../../services/extras/navigation.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sticky top-0 z-40 flex h-16 bg-white shadow-sm border-b border-gray-200">
      <div class="flex-1 px-4 flex justify-between items-center">
        <!-- Search Section -->
        <div class="flex-1 flex max-w-lg" (keydown)="$event.stopPropagation()">
          <div class="relative w-full text-gray-400 focus-within:text-gray-600">
            <div class="absolute inset-y-0 left-0 flex items-center pointer-events-none">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <input
              [(ngModel)]="searchQuery"
              class="block w-full pl-8 pr-3 py-2 border-transparent text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-0 focus:border-transparent rounded-md"
              [placeholder]="t('search.placeholder')"
              type="search"
              (focus)="openSuggestions()"
              (input)="onSearchChange()"
              (keydown.enter)="goToFirstMatch()"
              (keydown.arrowdown)="moveActive(1)"
              (keydown.arrowup)="moveActive(-1)"
              (keydown.escape)="closeSuggestions()"
            />
            <!-- Suggestions -->
            <div *ngIf="showSuggestions" class="absolute mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-50">
              <ng-container *ngIf="filteredItems.length; else noResults">
                <ul class="max-h-64 overflow-auto py-1">
                  <li
                    *ngFor="let item of filteredItems; let i = index"
                    (click)="navigate(item)"
                    [class]="i === activeIndex ? 'bg-gray-100' : ''"
                    class="px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center"
                  >
                    <span class="text-sm text-gray-700">{{ t(item.name) }}</span>
                    <span class="ml-auto text-xs text-gray-400">{{ item.href }}</span>
                  </li>
                </ul>
              </ng-container>
              <ng-template #noResults>
                <div class="px-3 py-2 text-sm text-gray-500">{{ t('search.no_results') }}</div>
              </ng-template>
            </div>
          </div>
        </div>
        
        <!-- User Section -->
        <div class="ml-4 flex items-center space-x-4">
          <div class="flex items-center space-x-3">
            <!-- User Name -->
            <span class="text-sm text-gray-700">
              {{ user?.first_name }} {{ user?.last_name }}
            </span>
            
            <!-- User Avatar -->
            <div class="h-8 w-8 rounded-full bg-[#00113f] flex items-center justify-center">
              <span class="text-white text-sm font-medium">
                {{ getInitials(user?.first_name, user?.last_name) }}
              </span>
            </div>
            
            <!-- Logout Button -->
            <button 
              (click)="handleLogout()"
              class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-white hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3e66ea] transition-colors duration-200"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class TopbarComponent implements OnInit, OnDestroy {
  searchQuery = '';
  user: User | null = null;
  items: NavigationItems = [];
  filteredItems: NavigationItem[] = [];
  showSuggestions = false;
  activeIndex = 0;
  private subs = new Subscription();

  constructor(
    private authService: AuthService,
    private alertService: AlertService,
    private languageService: LanguageService,
    private router: Router,
    private navigationService: NavigationService,
  ) {}

  ngOnInit(): void {
    // Get current user from auth service
    this.loadCurrentUser();
    this.items = this.navigationService.getItems();
  }

  private loadCurrentUser(): void {
    // Subscribe to auth state changes
    this.authService.authState$.subscribe((authState: any) => {
      this.user = authState.user;
    });
  }

  getInitials(firstName?: string, lastName?: string): string {
    if (!firstName && !lastName) return 'U';
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  }

  async handleLogout(): Promise<void> {
    try {
      console.log('Logout button clicked');
      
      await this.authService.logout();
      
      this.alertService.success(
        this.t('auth.logout_success') || 'Sesión cerrada exitosamente',
        this.t('auth.goodbye') || 'Hasta luego'
      );
      
      // Navigate to login
      this.router.navigate(['/login']);
    } catch (error: any) {
      console.error('Logout error:', error);
      this.alertService.error(
        error.message || this.t('auth.logout_error') || 'Error al cerrar sesión',
        this.t('auth.logout_failed') || 'Error'
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
    this.filteredItems = this.items.filter(item => {
      const translated = this.t(item.name).toLowerCase();
      const nameMatch = translated.includes(query);
      const routeMatch = item.href.toLowerCase().includes(query);
      return nameMatch || routeMatch;
    }).slice(0, 10);

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
    const closestSearch = target.closest('input[type="search"], .absolute.mt-1');
    if (!closestSearch) {
      this.closeSuggestions();
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
