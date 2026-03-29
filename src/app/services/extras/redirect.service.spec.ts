import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RedirectService } from './redirect.service';

describe('RedirectService', () => {
  let service: RedirectService;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        RedirectService,
        { provide: Router, useValue: routerSpy },
      ],
    });

    service = TestBed.inject(RedirectService);
  });

  describe('redirectToLogin()', () => {
    it('navigates to /login', () => {
      service.redirectToLogin();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });
  });
});
