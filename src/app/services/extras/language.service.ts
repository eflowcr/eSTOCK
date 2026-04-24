import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { translations } from '../../translations';

export interface Language {
  code: string;
  name: string;
  flag: string;
}

/**
 * LanguageService — i18n translation service for eSTOCK.
 *
 * ## Usage convention (CA5 — S2.5)
 *
 * **Preferred:** inject the service and call `this.languageService.t(key)`.
 *
 * ```typescript
 * constructor(private languageService: LanguageService) {}
 *
 * // preferred shorthand
 * label = this.languageService.t('stock_ledger.title');
 *
 * // or bind a local alias for convenience in components with many calls:
 * t = (key: string) => this.languageService.t(key);
 * ```
 *
 * **Deprecated:** `this.languageService.translate(key)` — still works but
 * prefer `t()` in all new code for consistency across sibling files.
 *
 * ## Template interpolation with `{n}` placeholders
 *
 * Translation values can contain `{n}` placeholders. Substitute manually:
 *
 * ```typescript
 * this.languageService.t('article_detail.general.time.minutes_ago').replace('{n}', String(n))
 * ```
 *
 * Or use `RelativeDatePipe` in templates for common relative-time formatting.
 */
@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private currentLanguageSubject = new BehaviorSubject<string>('es');
  public currentLanguage$ = this.currentLanguageSubject.asObservable();

  private translations: { [key: string]: { [key: string]: string } } = translations;

  public availableLanguages: Language[] = [
    { code: 'es', name: 'Español', flag: '' },
    { code: 'en', name: 'English', flag: '' }
  ];

  constructor() {
    // Load saved language from localStorage
    const savedLanguage = localStorage.getItem('estock-language');
    if (savedLanguage && this.availableLanguages.find(lang => lang.code === savedLanguage)) {
      this.currentLanguageSubject.next(savedLanguage);
    }
  }

  getCurrentLanguage(): string {
    return this.currentLanguageSubject.value;
  }

  setLanguage(languageCode: string): void {
    if (this.availableLanguages.find(lang => lang.code === languageCode)) {
      this.currentLanguageSubject.next(languageCode);
      localStorage.setItem('estock-language', languageCode);
    }
  }

  /**
   * Translates a key to the current language string.
   * Falls back to Spanish if the key is missing in the current language.
   * Returns the key itself if no translation is found in any language.
   *
   * @deprecated Prefer `t()` for consistency. Both methods are equivalent.
   */
  translate(key: string): string {
    const currentLang = this.getCurrentLanguage();
    const translation = this.translations[currentLang]?.[key];

    if (!translation) {
      // Fallback to Spanish if translation not found
      const fallback = this.translations['es']?.[key];
      if (!fallback) {
        return key;
      }
      return fallback;
    }

    return translation;
  }

  /**
   * Shorthand alias for `translate()`. **Preferred method** for all new code.
   *
   * ```typescript
   * this.languageService.t('stock_ledger.title')
   * ```
   */
  t(key: string): string {
    return this.translate(key);
  }

  getLanguageByCode(code: string): Language | undefined {
    return this.availableLanguages.find(lang => lang.code === code);
  }
}
