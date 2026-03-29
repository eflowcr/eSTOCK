import { TestBed } from '@angular/core/testing';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [LoadingService] });
    service = TestBed.inject(LoadingService);
  });

  describe('initial state', () => {
    it('starts not loading', () => {
      expect(service.isLoading).toBeFalse();
    });

    it('starts with 0 active requests', () => {
      expect(service.activeRequests).toBe(0);
    });
  });

  describe('show()', () => {
    it('sets isLoading to true on first call', () => {
      service.show();
      expect(service.isLoading).toBeTrue();
    });

    it('increments request count', () => {
      service.show();
      service.show();
      expect(service.activeRequests).toBe(2);
    });

    it('does not re-emit on second show (still true)', () => {
      service.show();
      service.show();
      expect(service.isLoading).toBeTrue();
    });
  });

  describe('hide()', () => {
    it('sets isLoading to false when last request completes', () => {
      service.show();
      service.hide();
      expect(service.isLoading).toBeFalse();
    });

    it('stays true while requests remain', () => {
      service.show();
      service.show();
      service.hide();
      expect(service.isLoading).toBeTrue();
      expect(service.activeRequests).toBe(1);
    });

    it('does not go below 0', () => {
      service.hide();
      expect(service.activeRequests).toBe(0);
      expect(service.isLoading).toBeFalse();
    });
  });

  describe('setLoading()', () => {
    it('forces loading true', () => {
      service.setLoading(true);
      expect(service.isLoading).toBeTrue();
      expect(service.activeRequests).toBe(1);
    });

    it('forces loading false', () => {
      service.show();
      service.setLoading(false);
      expect(service.isLoading).toBeFalse();
      expect(service.activeRequests).toBe(0);
    });
  });

  describe('loading$ observable', () => {
    it('emits true when show() is called', (done) => {
      let emitCount = 0;
      service.loading$.subscribe((val) => {
        emitCount++;
        if (emitCount === 2) {
          expect(val).toBeTrue();
          done();
        }
      });
      service.show();
    });
  });
});
