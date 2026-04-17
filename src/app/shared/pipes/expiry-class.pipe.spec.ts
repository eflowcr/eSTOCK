import { ExpiryClassPipe } from './expiry-class.pipe';

describe('ExpiryClassPipe', () => {
  let pipe: ExpiryClassPipe;

  beforeEach(() => { pipe = new ExpiryClassPipe(); });

  function dateInDays(offset: number): string {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0];
  }

  it('returns muted for null', () => {
    expect(pipe.transform(null)).toBe('text-muted-foreground');
  });

  it('returns muted for undefined', () => {
    expect(pipe.transform(undefined)).toBe('text-muted-foreground');
  });

  it('returns dark for expired (< 0 days)', () => {
    const cls = pipe.transform(dateInDays(-1));
    expect(cls).toContain('bg-gray-300');
  });

  it('returns red for < 30 days', () => {
    const cls = pipe.transform(dateInDays(15));
    expect(cls).toContain('bg-red-100');
  });

  it('returns amber for 30-59 days', () => {
    const cls = pipe.transform(dateInDays(45));
    expect(cls).toContain('bg-amber-100');
  });

  it('returns green for >= 60 days', () => {
    const cls = pipe.transform(dateInDays(90));
    expect(cls).toContain('bg-green-100');
  });
});
