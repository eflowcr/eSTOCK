import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ApiResponse } from '@app/models';
import { DEFAULT_PREFERENCES, UserPreferences } from '@app/models/user-preferences.model';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';
import { ThemeService } from './extras/theme.service';
import { LanguageService } from './extras/language.service';

const PREFERENCES_URL = returnCompleteURI({
  URI: environment.API.BASE,
  API_Gateway: '/user/preferences',
});

@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private prefsSubject = new BehaviorSubject<UserPreferences>(DEFAULT_PREFERENCES);
  prefs$ = this.prefsSubject.asObservable();

  constructor(
    private fetchService: FetchService,
    private themeService: ThemeService,
    private languageService: LanguageService,
  ) {}

  get current(): UserPreferences {
    return this.prefsSubject.value;
  }

  /** Load preferences from backend, then apply theme + language. */
  async load(): Promise<void> {
    try {
      const resp = await this.fetchService.get<ApiResponse<UserPreferences>>({
        API_Gateway: PREFERENCES_URL,
      });
      if (resp?.result?.success && resp.data) {
        this.prefsSubject.next(resp.data);
        this.themeService.apply(resp.data.theme, true);
        this.languageService.setLanguage(resp.data.language);
      }
    } catch {
      // Silently fall back to defaults — app still works without preferences
    }
  }

  /** Persist updated preferences to backend, then apply locally. */
  async save(prefs: UserPreferences): Promise<UserPreferences> {
    const resp = await this.fetchService.put<ApiResponse<UserPreferences>>({
      API_Gateway: PREFERENCES_URL,
      values: prefs,
    });
    if (resp?.result?.success && resp.data) {
      this.prefsSubject.next(resp.data);
      this.themeService.apply(resp.data.theme, true);
      this.languageService.setLanguage(resp.data.language);
      return resp.data;
    }
    throw new Error(resp?.result?.message ?? 'Failed to save preferences');
  }
}
