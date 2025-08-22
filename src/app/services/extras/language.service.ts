import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { translations } from '../../translations';

export interface Language {
  code: string;
  name: string;
  flag: string;
}

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

  // Shorthand method for translation
  t(key: string): string {
    return this.translate(key);
  }

  getLanguageByCode(code: string): Language | undefined {
    return this.availableLanguages.find(lang => lang.code === code);
  }
}
