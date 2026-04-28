import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { SidebarService } from '@app/services';
import { LanguageService } from '@app/services/extras/language.service';
import { NavigationService } from '@app/services/extras/navigation.service';

class StubLanguageService {
  t(key: string): string {
    return key;
  }
}

class StubNavigationService {
  getItems() {
    return [
      { name: 'Dashboard', href: '/', icon: 'LayoutDashboard' } as any,
      { name: 'Articles', href: '/articles', icon: 'Tag' } as any,
    ];
  }
}

describe('SidebarComponent — S3.7 W1 mobile responsive', () => {
  let fixture: ComponentFixture<SidebarComponent>;
  let component: SidebarComponent;
  let sidebarService: SidebarService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([]),
        SidebarService,
        { provide: LanguageService, useClass: StubLanguageService },
        { provide: NavigationService, useClass: StubNavigationService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    sidebarService = TestBed.inject(SidebarService);
    fixture.detectChanges();
  });

  it('starts with mobile drawer closed', () => {
    expect(component.mobileOpen).toBeFalse();
    const backdrop = fixture.nativeElement.querySelector('.fixed.inset-0');
    expect(backdrop).toBeNull();
  });

  it('renders backdrop overlay when mobile drawer opens', () => {
    sidebarService.openMobile();
    fixture.detectChanges();
    const backdrop = fixture.nativeElement.querySelector('.fixed.inset-0.z-30');
    expect(backdrop).not.toBeNull();
    expect((backdrop as HTMLElement).getAttribute('aria-hidden')).toBe('true');
  });

  it('closes mobile drawer when backdrop is clicked', () => {
    sidebarService.openMobile();
    fixture.detectChanges();
    const backdrop = fixture.nativeElement.querySelector('.fixed.inset-0.z-30') as HTMLElement;
    backdrop.click();
    fixture.detectChanges();
    expect(component.mobileOpen).toBeFalse();
  });

  it('closes mobile drawer when a nav item is clicked', () => {
    sidebarService.openMobile();
    fixture.detectChanges();
    component.onNavigationClick();
    expect(component.mobileOpen).toBeFalse();
  });

  it('sidebar has md:translate-x-0 to be visible on desktop by default', () => {
    const drawer = fixture.nativeElement.querySelector('[data-sidebar="header"]')?.parentElement
      ?.parentElement;
    expect(drawer).toBeTruthy();
    // The drawer container has md:translate-x-0 in its base classes.
    expect(drawer.className).toContain('md:translate-x-0');
  });
});
