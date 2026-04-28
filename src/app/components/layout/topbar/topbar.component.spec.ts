import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { TopbarComponent } from './topbar.component';
import { SidebarService } from '@app/services';
import { LanguageService } from '@app/services/extras/language.service';
import { NavigationService } from '@app/services/extras/navigation.service';
import { AuthService } from '../../../services/auth.service';
import { AlertService } from '../../../services/extras/alert.service';
import { AuthorizationService } from '../../../services/extras/authorization.service';

class StubLanguageService {
  t(key: string): string {
    return key;
  }
}

class StubNavigationService {
  getItems() {
    return [];
  }
}

class StubAuthService {
  authState$ = new BehaviorSubject<any>(null);
  getCurrentUser() {
    return null;
  }
  logout() {
    return Promise.resolve();
  }
}

class StubAlertService {
  success() {}
  error() {}
}

class StubAuthorizationService {
  getCurrentUser() {
    return null;
  }
}

describe('TopbarComponent — S3.7 W1 mobile responsive', () => {
  let fixture: ComponentFixture<TopbarComponent>;
  let component: TopbarComponent;
  let sidebarService: SidebarService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopbarComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        SidebarService,
        { provide: LanguageService, useClass: StubLanguageService },
        { provide: NavigationService, useClass: StubNavigationService },
        { provide: AuthService, useClass: StubAuthService },
        { provide: AlertService, useClass: StubAlertService },
        { provide: AuthorizationService, useClass: StubAuthorizationService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TopbarComponent);
    component = fixture.componentInstance;
    sidebarService = TestBed.inject(SidebarService);
    fixture.detectChanges();
  });

  it('renders the hamburger toggle button with aria-label', () => {
    const btn = fixture.nativeElement.querySelector('button[aria-label="Toggle sidebar"]');
    expect(btn).not.toBeNull();
  });

  it('hamburger has min 44px touch target on mobile (size-11)', () => {
    const btn = fixture.nativeElement.querySelector(
      'button[aria-label="Toggle sidebar"]',
    ) as HTMLElement;
    expect(btn).not.toBeNull();
    expect(btn.className).toContain('size-11');
  });

  it('toggleSidebar opens mobile drawer when viewport is narrow', () => {
    spyOn(window, 'matchMedia').and.returnValue({
      matches: true,
      media: '(max-width: 767px)',
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => true,
    } as any);

    expect(sidebarService.mobileOpen).toBeFalse();
    component.toggleSidebar();
    expect(sidebarService.mobileOpen).toBeTrue();
    expect(sidebarService.desktopCollapsed).toBeFalse();
  });

  it('toggleSidebar collapses desktop sidebar when viewport is wide', () => {
    spyOn(window, 'matchMedia').and.returnValue({
      matches: false,
      media: '(max-width: 767px)',
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => true,
    } as any);

    expect(sidebarService.desktopCollapsed).toBeFalse();
    component.toggleSidebar();
    expect(sidebarService.desktopCollapsed).toBeTrue();
    expect(sidebarService.mobileOpen).toBeFalse();
  });
});
