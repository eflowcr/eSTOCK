import { clamp, roundToStep, convertValueToPercentage } from './number';

describe('shared/utils/number', () => {

  describe('clamp()', () => {
    it('returns value when within range', () => {
      expect(clamp(5, [0, 10])).toBe(5);
    });

    it('returns min when value is below range', () => {
      expect(clamp(-1, [0, 10])).toBe(0);
    });

    it('returns max when value is above range', () => {
      expect(clamp(15, [0, 10])).toBe(10);
    });

    it('returns min/max when value equals boundary', () => {
      expect(clamp(0, [0, 10])).toBe(0);
      expect(clamp(10, [0, 10])).toBe(10);
    });
  });

  describe('roundToStep()', () => {
    it('rounds value to nearest step from min', () => {
      // step=5, min=0: values snap to 0, 5, 10...
      expect(roundToStep(3, 0, 5)).toBe(5);
      expect(roundToStep(2, 0, 5)).toBe(0);
    });

    it('rounds exactly on-step value unchanged', () => {
      expect(roundToStep(10, 0, 5)).toBe(10);
    });

    it('works with non-zero min', () => {
      // step=2, min=1: values snap to 1, 3, 5...
      // roundToStep(2, 1, 2) = Math.round((2-1)/2)*2+1 = Math.round(0.5)*2+1 = 1*2+1 = 3
      expect(roundToStep(2, 1, 2)).toBe(3);
    });
  });

  describe('convertValueToPercentage()', () => {
    it('returns 0 for min value', () => {
      expect(convertValueToPercentage(0, 0, 100)).toBe(0);
    });

    it('returns 100 for max value', () => {
      expect(convertValueToPercentage(100, 0, 100)).toBe(100);
    });

    it('returns 50 for midpoint', () => {
      expect(convertValueToPercentage(50, 0, 100)).toBe(50);
    });

    it('works with non-zero min', () => {
      expect(convertValueToPercentage(15, 10, 20)).toBe(50);
    });
  });
});
