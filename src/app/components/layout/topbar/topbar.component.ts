import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AlertService } from '../../../services/extras/alert.service';
import { LanguageService } from '../../../services/extras/language.service';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sticky top-0 z-40 flex h-16 bg-white shadow-sm border-b border-gray-200">
      <div class="flex-1 px-4 flex justify-between items-center">
        <!-- Search Section -->
        <div class="flex-1 flex max-w-lg">
          <div class="relative w-full text-gray-400 focus-within:text-gray-600">
            <div class="absolute inset-y-0 left-0 flex items-center pointer-events-none">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <input
              [(ngModel)]="searchQuery"
              class="block w-full pl-8 pr-3 py-2 border-transparent text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-0 focus:border-transparent rounded-md"
              placeholder="Search..."
              type="search"
            />
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
export class TopbarComponent implements OnInit {
  searchQuery = '';
  user: User | null = null;

  constructor(
    private authService: AuthService,
    private alertService: AlertService,
    private languageService: LanguageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Get current user from auth service
    this.loadCurrentUser();
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
}
