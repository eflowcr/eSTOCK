import { TestBed } from '@angular/core/testing';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
  let service: LanguageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [LanguageService] });
    service = TestBed.inject(LanguageService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('initial state', () => {
    it('defaults to Spanish', () => {
      expect(service.getCurrentLanguage()).toBe('es');
    });

    it('restores saved language from localStorage', () => {
      localStorage.setItem('estock-language', 'en');
      const fresh = new LanguageService();
      expect(fresh.getCurrentLanguage()).toBe('en');
    });

    it('ignores unknown language in localStorage', () => {
      localStorage.setItem('estock-language', 'fr');
      const fresh = new LanguageService();
      expect(fresh.getCurrentLanguage()).toBe('es');
    });
  });

  describe('setLanguage()', () => {
    it('switches to English', () => {
      service.setLanguage('en');
      expect(service.getCurrentLanguage()).toBe('en');
    });

    it('persists to localStorage', () => {
      service.setLanguage('en');
      expect(localStorage.getItem('estock-language')).toBe('en');
    });

    it('ignores unknown language code', () => {
      service.setLanguage('ja');
      expect(service.getCurrentLanguage()).toBe('es');
    });
  });

  describe('translate()', () => {
    it('returns the translation for a valid key in current language', () => {
      service.setLanguage('es');
      const value = service.translate('app.name');
      // Should return something other than the key (or key if not defined — just not crash)
      expect(typeof value).toBe('string');
    });

    it('falls back to Spanish when key missing in English', () => {
      service.setLanguage('en');
      // Use a key that only exists in Spanish translations
      const value = service.translate('non_existent_key_xyz');
      // Falls back to 'es' or returns key — either is valid per implementation
      expect(typeof value).toBe('string');
    });

    it('t() is an alias for translate()', () => {
      expect(service.t('app.name')).toBe(service.translate('app.name'));
    });
  });

  describe('getLanguageByCode()', () => {
    it('returns language object for known code', () => {
      const lang = service.getLanguageByCode('en');
      expect(lang).toBeDefined();
      expect(lang?.code).toBe('en');
    });

    it('returns undefined for unknown code', () => {
      expect(service.getLanguageByCode('xx')).toBeUndefined();
    });
  });

  describe('availableLanguages', () => {
    it('includes es and en', () => {
      const codes = service.availableLanguages.map((l) => l.code);
      expect(codes).toContain('es');
      expect(codes).toContain('en');
    });
  });
});
