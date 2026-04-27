import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LanguageService } from '@app/services/extras/language.service';

/**
 * 404 Not Found component (B19 fix S3.6).
 * Replaces the silent redirect to /dashboard for unknown routes.
 */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-6">
      <div class="max-w-md w-full bg-background border border-border rounded-2xl shadow-lg p-8 text-center space-y-6">
        <div class="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <svg class="h-10 w-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
          </svg>
        </div>

        <div class="space-y-2">
          <p class="text-5xl font-bold text-foreground">404</p>
          <h1 class="text-xl font-semibold text-foreground">{{ t('not_found.title') }}</h1>
          <p class="text-sm text-muted-foreground">{{ t('not_found.subtitle') }}</p>
        </div>

        <div class="flex flex-col sm:flex-row gap-3">
          <a
            routerLink="/dashboard"
            class="flex-1 bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 text-center"
          >
            {{ t('not_found.back_to_dashboard') }}
          </a>
          <a
            href="mailto:soporte@eflowsuite.com?subject=404%20-%20P%C3%A1gina%20no%20encontrada"
            class="flex-1 border border-border hover:bg-muted text-foreground font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 text-center"
          >
            {{ t('not_found.report') }}
          </a>
        </div>

        <p class="text-xs text-muted-foreground pt-2 break-all">{{ currentUrl }}</p>
      </div>
    </div>
  `,
  styles: [],
})
export class NotFoundComponent {
  readonly currentUrl: string;

  constructor(
    private languageService: LanguageService,
    private router: Router,
  ) {
    this.currentUrl = this.router.url;
  }

  t(key: string): string {
    return this.languageService.t(key);
  }
}
