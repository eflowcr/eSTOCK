import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');

    TestBed.configureTestingModule({ providers: [ThemeService] });
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  describe('initial state', () => {
    it('defaults to system when no saved preference', () => {
      expect(service.current).toBe('system');
    });

    it('restores saved theme from localStorage', () => {
      localStorage.setItem('estock-theme', 'dark');
      // Re-create service to trigger constructor
      const fresh = new ThemeService();
      expect(fresh.current).toBe('dark');
    });
  });

  describe('apply()', () => {
    it('updates current theme', () => {
      service.apply('light');
      expect(service.current).toBe('light');
    });

    it('applies dark class to documentElement when theme is dark', () => {
      service.apply('dark');
      expect(document.documentElement.classList.contains('dark')).toBeTrue();
    });

    it('removes dark class when theme is light', () => {
      document.documentElement.classList.add('dark');
      service.apply('light');
      expect(document.documentElement.classList.contains('dark')).toBeFalse();
    });

    it('persists to localStorage when persist=true (default)', () => {
      service.apply('dark');
      expect(localStorage.getItem('estock-theme')).toBe('dark');
    });

    it('does NOT persist to localStorage when persist=false', () => {
      service.apply('dark', false);
      expect(localStorage.getItem('estock-theme')).toBeNull();
    });

    it('emits new theme via theme$ observable', (done) => {
      service.theme$.subscribe((t) => {
        if (t === 'light') {
          expect(t).toBe('light');
          done();
        }
      });
      service.apply('light');
    });
  });
});
