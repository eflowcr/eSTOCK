import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AppTheme } from '@app/models/user-preferences.model';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'estock-theme';
  private themeSubject = new BehaviorSubject<AppTheme>('system');
  theme$ = this.themeSubject.asObservable();

  constructor() {
    const saved = localStorage.getItem(this.STORAGE_KEY) as AppTheme | null;
    this.apply(saved ?? 'system', false);

    // Re-apply when system preference changes (e.g. OS switches dark mode at sunset)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.themeSubject.value === 'system') {
        this.applyEffective();
      }
    });
  }

  get current(): AppTheme {
    return this.themeSubject.value;
  }

  /** Apply a theme immediately and persist it. */
  apply(theme: AppTheme, persist = true): void {
    this.themeSubject.next(theme);
    if (persist) {
      localStorage.setItem(this.STORAGE_KEY, theme);
    }
    this.applyEffective();
  }

  private applyEffective(): void {
    const isDark =
      this.themeSubject.value === 'dark' ||
      (this.themeSubject.value === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  }
}
