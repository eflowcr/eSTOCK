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

// ────────────────────────────────────────────────────────────────────────
// S3.7 W3 (B11 + B12) — sidebar items + section headings resolve to Spanish.
// Uses the real LanguageService (with the actual translation tables) so we
// can assert that bare nav keys actually resolve to the expected strings.
// ────────────────────────────────────────────────────────────────────────

describe('SidebarComponent — S3.7 W3 i18n keys (B11 + B12)', () => {
  class StubNavigationServiceB11 {
    getItems() {
      return [
        { name: 'receiving_tasks', href: '/receiving-tasks', icon: 'Download' } as any,
        { name: 'picking_tasks', href: '/picking-tasks', icon: 'ClipboardCheck' } as any,
        { name: 'stock_adjustments', href: '/stock-adjustments', icon: 'Edit' } as any,
        { name: 'categories', href: '/categories', icon: 'FolderTree' } as any,
        { name: 'inventory', href: '/inventory', icon: 'Archive' } as any,
        { name: 'clients', href: '/clients', icon: 'Building' } as any,
      ];
    }
  }

  let language: LanguageService;

  beforeEach(async () => {
    // Force ES locale before instantiation to keep the assertion stable.
    localStorage.setItem('estock-language', 'es');

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([]),
        SidebarService,
        LanguageService,
        { provide: NavigationService, useClass: StubNavigationServiceB11 },
      ],
    }).compileComponents();

    language = TestBed.inject(LanguageService);
    language.setLanguage('es');
    const fix = TestBed.createComponent(SidebarComponent);
    fix.detectChanges();
  });

  afterEach(() => {
    localStorage.removeItem('estock-language');
  });

  it('B12: bare "categories" nav key resolves to "Categorías" (Title Case)', () => {
    expect(language.t('categories')).toBe('Categorías');
  });

  it('B11: nav item keys resolve to Spanish (no English leakage)', () => {
    expect(language.t('receiving_tasks')).toBe('Tareas de Recepción');
    expect(language.t('picking_tasks')).toBe('Tareas de Picking');
    expect(language.t('stock_adjustments')).toBe('Ajustes de Stock');
    expect(language.t('inventory')).toBe('Inventario');
    expect(language.t('clients')).toBe('Clientes');
    expect(language.t('articles')).toBe('Artículos');
  });

  it('B11: sidebar section heading keys resolve to Spanish', () => {
    expect(language.t('sidebar.section.operations')).toBe('Operaciones');
    expect(language.t('sidebar.section.inventory')).toBe('Inventario');
    expect(language.t('sidebar.section.administration')).toBe('Administración');
    expect(language.t('sidebar.section.overview')).toBe('Resumen');
  });
});
