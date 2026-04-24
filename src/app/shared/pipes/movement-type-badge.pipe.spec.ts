import { MovementTypeBadgePipe } from './movement-type-badge.pipe';

describe('MovementTypeBadgePipe', () => {
  let pipe: MovementTypeBadgePipe;

  beforeEach(() => { pipe = new MovementTypeBadgePipe(); });

  // ── pill variant (default) ───────────────────────────────────────────────

  it('returns full pill classes for inbound', () => {
    const cls = pipe.transform('inbound');
    expect(cls).toContain('inline-flex');
    expect(cls).toContain('rounded-full');
    expect(cls).toContain('bg-green-100');
    expect(cls).toContain('text-green-800');
  });

  it('returns full pill classes for outbound', () => {
    const cls = pipe.transform('outbound');
    expect(cls).toContain('bg-blue-100');
    expect(cls).toContain('text-blue-800');
  });

  it('returns full pill classes for adjustment', () => {
    const cls = pipe.transform('adjustment');
    expect(cls).toContain('bg-amber-100');
  });

  it('returns full pill classes for transfer', () => {
    const cls = pipe.transform('transfer');
    expect(cls).toContain('bg-indigo-100');
  });

  it('returns full pill classes for rejected', () => {
    const cls = pipe.transform('rejected');
    expect(cls).toContain('bg-red-100');
  });

  it('returns muted fallback for unknown type', () => {
    const cls = pipe.transform('unknown' as any);
    expect(cls).toContain('bg-muted');
    expect(cls).toContain('text-muted-foreground');
    expect(cls).toContain('inline-flex'); // still pill shape
  });

  it('returns muted fallback for null', () => {
    const cls = pipe.transform(null);
    expect(cls).toContain('bg-muted');
  });

  // ── color variant ────────────────────────────────────────────────────────

  it('omits shape classes in color variant', () => {
    const cls = pipe.transform('inbound', 'color');
    expect(cls).toContain('bg-green-100');
    expect(cls).not.toContain('inline-flex');
    expect(cls).not.toContain('rounded-full');
  });

  it('color variant returns fallback for null', () => {
    const cls = pipe.transform(null, 'color');
    expect(cls).toContain('bg-muted');
    expect(cls).not.toContain('inline-flex');
  });
});
