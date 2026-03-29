import { TestBed } from '@angular/core/testing';
import { SidebarService } from './sidebar.service';

describe('SidebarService', () => {
  let service: SidebarService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [SidebarService] });
    service = TestBed.inject(SidebarService);
  });

  describe('initial state', () => {
    it('desktop starts expanded (not collapsed)', () => {
      expect(service.desktopCollapsed).toBeFalse();
    });

    it('mobile starts closed', () => {
      expect(service.mobileOpen).toBeFalse();
    });
  });

  describe('toggleDesktop()', () => {
    it('collapses when expanded', () => {
      service.toggleDesktop();
      expect(service.desktopCollapsed).toBeTrue();
    });

    it('expands when collapsed', () => {
      service.toggleDesktop();
      service.toggleDesktop();
      expect(service.desktopCollapsed).toBeFalse();
    });
  });

  describe('setDesktopCollapsed()', () => {
    it('sets to true', () => {
      service.setDesktopCollapsed(true);
      expect(service.desktopCollapsed).toBeTrue();
    });

    it('sets to false', () => {
      service.setDesktopCollapsed(true);
      service.setDesktopCollapsed(false);
      expect(service.desktopCollapsed).toBeFalse();
    });
  });

  describe('toggleMobile()', () => {
    it('opens when closed', () => {
      service.toggleMobile();
      expect(service.mobileOpen).toBeTrue();
    });

    it('closes when open', () => {
      service.openMobile();
      service.toggleMobile();
      expect(service.mobileOpen).toBeFalse();
    });
  });

  describe('openMobile() / closeMobile()', () => {
    it('openMobile sets to true', () => {
      service.openMobile();
      expect(service.mobileOpen).toBeTrue();
    });

    it('closeMobile sets to false', () => {
      service.openMobile();
      service.closeMobile();
      expect(service.mobileOpen).toBeFalse();
    });
  });

  describe('observables', () => {
    it('desktopCollapsed$ emits on toggle', (done) => {
      let emitCount = 0;
      service.desktopCollapsed$.subscribe((val) => {
        emitCount++;
        if (emitCount === 2) {
          expect(val).toBeTrue();
          done();
        }
      });
      service.toggleDesktop();
    });

    it('mobileOpen$ emits on open', (done) => {
      let emitCount = 0;
      service.mobileOpen$.subscribe((val) => {
        emitCount++;
        if (emitCount === 2) {
          expect(val).toBeTrue();
          done();
        }
      });
      service.openMobile();
    });
  });
});
