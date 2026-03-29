import { mergeClasses, noopFn } from './merge-classes';

describe('shared/utils/merge-classes', () => {

  describe('mergeClasses()', () => {
    it('merges two class strings', () => {
      expect(mergeClasses('foo', 'bar')).toBe('foo bar');
    });

    it('resolves Tailwind conflicts (later class wins)', () => {
      // text-red-500 then text-blue-500 → only text-blue-500 remains
      const result = mergeClasses('text-red-500', 'text-blue-500');
      expect(result).not.toContain('text-red-500');
      expect(result).toContain('text-blue-500');
    });

    it('handles conditional classes via object syntax', () => {
      const result = mergeClasses({ 'font-bold': true, italic: false });
      expect(result).toContain('font-bold');
      expect(result).not.toContain('italic');
    });

    it('handles arrays of classes', () => {
      const result = mergeClasses(['px-4', 'py-2'], 'text-sm');
      expect(result).toContain('px-4');
      expect(result).toContain('py-2');
      expect(result).toContain('text-sm');
    });

    it('handles empty inputs', () => {
      expect(mergeClasses()).toBe('');
      expect(mergeClasses('')).toBe('');
    });

    it('handles undefined/null values without throwing', () => {
      expect(() => mergeClasses(undefined as any, null as any)).not.toThrow();
    });
  });

  describe('noopFn()', () => {
    it('returns undefined', () => {
      expect(noopFn()).toBeUndefined();
    });

    it('does not throw', () => {
      expect(() => noopFn()).not.toThrow();
    });
  });
});
