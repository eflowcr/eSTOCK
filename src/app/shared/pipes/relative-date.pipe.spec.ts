import { RelativeDatePipe } from './relative-date.pipe';
import { LanguageService } from '@app/services/extras/language.service';

/** Minimal stub that mirrors the Spanish translations for relative time. */
function makeLanguageService(): LanguageService {
  const svc = jasmine.createSpyObj<LanguageService>('LanguageService', ['t', 'translate']);
  svc.t.and.callFake((key: string) => {
    const map: Record<string, string> = {
      'article_detail.general.time.just_now': 'hace instantes',
      'article_detail.general.time.minutes_ago': 'hace {n} min',
      'article_detail.general.time.hours_ago': 'hace {n} h',
      'article_detail.general.time.days_ago': 'hace {n} días',
      'article_detail.general.time.months_ago': 'hace {n} meses',
      'article_detail.general.time.years_ago': 'hace {n} años',
    };
    return map[key] ?? key;
  });
  return svc;
}

function msAgo(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

describe('RelativeDatePipe', () => {
  let pipe: RelativeDatePipe;

  beforeEach(() => {
    pipe = new RelativeDatePipe(makeLanguageService());
  });

  it('returns empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('returns just_now for < 60 seconds', () => {
    expect(pipe.transform(msAgo(30_000))).toBe('hace instantes');
  });

  it('returns minutes_ago for < 60 minutes', () => {
    const result = pipe.transform(msAgo(5 * 60_000)); // 5 min ago
    expect(result).toBe('hace 5 min');
  });

  it('returns hours_ago for < 24 hours', () => {
    const result = pipe.transform(msAgo(3 * 3600_000)); // 3 hours ago
    expect(result).toBe('hace 3 h');
  });

  it('returns days_ago for < 30 days', () => {
    const result = pipe.transform(msAgo(10 * 86400_000)); // 10 days ago
    expect(result).toBe('hace 10 días');
  });

  it('returns months_ago for < 12 months', () => {
    const result = pipe.transform(msAgo(60 * 86400_000)); // ~2 months ago
    expect(result).toContain('meses');
  });

  it('returns years_ago for >= 12 months', () => {
    const result = pipe.transform(msAgo(400 * 86400_000)); // ~13 months ago
    expect(result).toContain('años');
  });

  it('accepts Date objects', () => {
    const date = new Date(Date.now() - 2 * 3600_000); // 2 hours ago
    expect(pipe.transform(date)).toBe('hace 2 h');
  });

  it('returns empty string for invalid date string', () => {
    expect(pipe.transform('not-a-date')).toBe('');
  });
});
