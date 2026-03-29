import { TestBed } from '@angular/core/testing';
import { UserPreferencesService } from './user-preferences.service';
import { FetchService } from './extras/fetch.service';
import { ThemeService } from './extras/theme.service';
import { LanguageService } from './extras/language.service';
import { mockResponse } from '../../__tests__/mocks/data';

const MOCK_PREFS = { theme: 'dark', language: 'en' } as any;

describe('UserPreferencesService', () => {
  let service: UserPreferencesService;
  let fetchSpy: jasmine.SpyObj<FetchService>;
  let themeSpy: jasmine.SpyObj<ThemeService>;
  let langSpy: jasmine.SpyObj<LanguageService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'put']);
    themeSpy = jasmine.createSpyObj('ThemeService', ['apply']);
    langSpy = jasmine.createSpyObj('LanguageService', ['setLanguage']);

    TestBed.configureTestingModule({
      providers: [
        UserPreferencesService,
        { provide: FetchService, useValue: fetchSpy },
        { provide: ThemeService, useValue: themeSpy },
        { provide: LanguageService, useValue: langSpy },
      ],
    });

    service = TestBed.inject(UserPreferencesService);
  });

  describe('current', () => {
    it('returns default preferences initially', () => {
      expect(service.current).toBeDefined();
    });
  });

  // ─── load ─────────────────────────────────────────────────────────────────

  describe('load()', () => {
    it('applies theme and language on success', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(MOCK_PREFS)));
      await service.load();
      expect(themeSpy.apply).toHaveBeenCalledWith('dark', true);
      expect(langSpy.setLanguage).toHaveBeenCalledWith('en');
    });

    it('updates current prefs on success', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(MOCK_PREFS)));
      await service.load();
      expect(service.current).toEqual(MOCK_PREFS);
    });

    it('silently ignores errors (no throw)', async () => {
      fetchSpy.get.and.returnValue(Promise.reject(new Error('Network error')));
      await expectAsync(service.load()).toBeResolved();
    });

    it('does nothing when response is not successful', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(MOCK_PREFS, false)));
      await service.load();
      expect(themeSpy.apply).not.toHaveBeenCalled();
    });
  });

  // ─── save ─────────────────────────────────────────────────────────────────

  describe('save()', () => {
    it('calls PUT with preferences', async () => {
      fetchSpy.put.and.returnValue(Promise.resolve(mockResponse(MOCK_PREFS)));
      await service.save(MOCK_PREFS);
      expect(fetchSpy.put).toHaveBeenCalledWith(
        jasmine.objectContaining({ values: MOCK_PREFS })
      );
    });

    it('applies theme and language on success', async () => {
      fetchSpy.put.and.returnValue(Promise.resolve(mockResponse(MOCK_PREFS)));
      await service.save(MOCK_PREFS);
      expect(themeSpy.apply).toHaveBeenCalledWith('dark', true);
      expect(langSpy.setLanguage).toHaveBeenCalledWith('en');
    });

    it('returns saved preferences', async () => {
      fetchSpy.put.and.returnValue(Promise.resolve(mockResponse(MOCK_PREFS)));
      const result = await service.save(MOCK_PREFS);
      expect(result).toEqual(MOCK_PREFS);
    });

    it('throws when response is not successful', async () => {
      fetchSpy.put.and.returnValue(Promise.resolve(mockResponse(MOCK_PREFS, false)));
      await expectAsync(service.save(MOCK_PREFS)).toBeRejected();
    });
  });
});
