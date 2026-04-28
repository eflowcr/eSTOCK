import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ArticleDetailComponent } from './article-detail.component';
import { ArticleService } from '@app/services/article.service';
import { AlertService } from '@app/services/extras/alert.service';
import { AuthorizationService } from '@app/services/extras/authorization.service';
import { LanguageService } from '@app/services/extras/language.service';
import { Article } from '@app/models/article.model';

const MOCK_ARTICLE: Article = {
  id: 'art-001',
  sku: 'PROD-001',
  name: 'Producto de Prueba',
  description: 'Descripción de prueba',
  unit_price: 100,
  presentation: 'unit',
  track_by_lot: true,
  track_by_serial: false,
  track_expiration: true,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  category: { id: 'cat-1', name: 'Electrónica' },
};

const okResponse = (data: any) => Promise.resolve({ result: { success: true, endpoint_code: '' }, data });
const notFoundError = () => Promise.reject({ status: 404 });

const mockArticleServiceOk = { getBySku: () => okResponse(MOCK_ARTICLE), getById: () => okResponse(MOCK_ARTICLE) };
const mockArticleServiceNotFound = { getBySku: () => notFoundError(), getById: () => notFoundError() };
const mockAlertService = { success: jasmine.createSpy('success'), error: jasmine.createSpy('error') };
const mockAuthAdmin = { isAdmin: () => true, isAuthenticated: () => true, hasPermission: () => true, getCurrentUser: () => ({ name: 'Test', last_name: 'User', role: 'Admin', email: 'test@test.com' }) };
const mockLanguageService = { t: (key: string) => key };

function makeRoute(sku: string, tab?: string) {
  const queryParams: Record<string, string> = {};
  if (tab) queryParams['tab'] = tab;
  return {
    snapshot: {
      paramMap: { get: (k: string) => (k === 'sku' ? sku : null) },
      queryParamMap: { get: (k: string) => queryParams[k] ?? null },
    },
  };
}

describe('ArticleDetailComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, RouterModule.forRoot([]), HttpClientTestingModule, ArticleDetailComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ArticleService, useValue: mockArticleServiceOk },
        { provide: AlertService, useValue: mockAlertService },
        { provide: AuthorizationService, useValue: mockAuthAdmin },
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: ActivatedRoute, useValue: makeRoute('PROD-001') },
      ],
    }).compileComponents();
  });

  it('creates the component', () => {
    const fixture = TestBed.createComponent(ArticleDetailComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('defaults to general tab', () => {
    const fixture = TestBed.createComponent(ArticleDetailComponent);
    expect(fixture.componentInstance.activeTab).toBe('general');
  });

  it('has 6 tabs defined', () => {
    const fixture = TestBed.createComponent(ArticleDetailComponent);
    expect(fixture.componentInstance.tabs.length).toBe(6);
    const keys = fixture.componentInstance.tabs.map((t) => t.key);
    expect(keys).toEqual(['general', 'inventario', 'historial', 'trazabilidad', 'alertas', 'proveedores']);
  });

  it('populates article after successful load', fakeAsync(() => {
    const fixture = TestBed.createComponent(ArticleDetailComponent);
    const comp = fixture.componentInstance;
    comp.ngOnInit();
    tick();
    expect(comp.article).toEqual(MOCK_ARTICLE);
    expect(comp.notFound).toBe(false);
  }));

  it('sets isAdmin based on auth service', () => {
    const fixture = TestBed.createComponent(ArticleDetailComponent);
    expect(fixture.componentInstance.isAdmin()).toBe(true);
  });
});

describe('ArticleDetailComponent — tab switching', () => {
  let navigateSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, RouterModule.forRoot([]), HttpClientTestingModule, ArticleDetailComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ArticleService, useValue: mockArticleServiceOk },
        { provide: AlertService, useValue: mockAlertService },
        { provide: AuthorizationService, useValue: mockAuthAdmin },
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: ActivatedRoute, useValue: makeRoute('PROD-001') },
      ],
    }).compileComponents();
  });

  it('selectTab updates activeTab', () => {
    const fixture = TestBed.createComponent(ArticleDetailComponent);
    const comp = fixture.componentInstance;
    comp.selectTab('inventario');
    expect(comp.activeTab).toBe('inventario');
  });

  it('selectTab cycles through all tabs', () => {
    const fixture = TestBed.createComponent(ArticleDetailComponent);
    const comp = fixture.componentInstance;
    for (const tab of comp.tabs) {
      comp.selectTab(tab.key);
      expect(comp.activeTab).toBe(tab.key);
    }
  });
});

describe('ArticleDetailComponent — tab from query param', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, RouterModule.forRoot([]), HttpClientTestingModule, ArticleDetailComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ArticleService, useValue: mockArticleServiceOk },
        { provide: AlertService, useValue: mockAlertService },
        { provide: AuthorizationService, useValue: mockAuthAdmin },
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: ActivatedRoute, useValue: makeRoute('PROD-001', 'inventario') },
      ],
    }).compileComponents();
  });

  it('reads tab from query param on init', () => {
    const fixture = TestBed.createComponent(ArticleDetailComponent);
    fixture.componentInstance.ngOnInit();
    expect(fixture.componentInstance.activeTab).toBe('inventario');
  });
});

describe('ArticleDetailComponent — 404 state', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, RouterModule.forRoot([]), HttpClientTestingModule, ArticleDetailComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ArticleService, useValue: mockArticleServiceNotFound },
        { provide: AlertService, useValue: mockAlertService },
        { provide: AuthorizationService, useValue: mockAuthAdmin },
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: ActivatedRoute, useValue: makeRoute('SKU-INEXISTENTE') },
      ],
    }).compileComponents();
  });

  it('sets notFound=true on 404 from both SKU and ID lookups', fakeAsync(() => {
    const fixture = TestBed.createComponent(ArticleDetailComponent);
    const comp = fixture.componentInstance;
    comp.ngOnInit();
    tick();
    tick(); // second tick: let the B9 ID fallback also resolve before asserting
    expect(comp.notFound).toBe(true);
    expect(comp.article).toBeNull();
  }));
});

// B9 (S3.7-W4): when SKU lookup 404s (e.g. when navigated by UUID from the
// dashboard valuation widget), fall back to ID lookup before declaring the
// article missing. This lets stable identifiers work transparently while the
// route param is still nominally `:sku`.
describe('ArticleDetailComponent — B9 ID fallback when SKU lookup 404s', () => {
  const ART_BY_ID: Article = { ...MOCK_ARTICLE, id: 'art-uuid-001', sku: 'PROD-001' };

  beforeEach(async () => {
    const mockServiceWithFallback = {
      getBySku: jasmine.createSpy('getBySku').and.returnValue(notFoundError()),
      getById: jasmine.createSpy('getById').and.returnValue(okResponse(ART_BY_ID)),
    };

    await TestBed.configureTestingModule({
      imports: [CommonModule, RouterModule.forRoot([]), HttpClientTestingModule, ArticleDetailComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ArticleService, useValue: mockServiceWithFallback },
        { provide: AlertService, useValue: mockAlertService },
        { provide: AuthorizationService, useValue: mockAuthAdmin },
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: ActivatedRoute, useValue: makeRoute('art-uuid-001') },
      ],
    }).compileComponents();
  });

  it('falls back to getById when getBySku returns 404 and resolves the article', fakeAsync(() => {
    const fixture = TestBed.createComponent(ArticleDetailComponent);
    const comp = fixture.componentInstance;
    comp.ngOnInit();
    tick();
    tick();
    expect(comp.article?.id).toBe('art-uuid-001');
    expect(comp.notFound).toBe(false);
  }));
});

describe('ArticleDetailComponent — loading state', () => {
  let resolveFn: (value: any) => void;
  const slowService = {
    getBySku: () => new Promise((resolve) => { resolveFn = resolve; }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, RouterModule.forRoot([]), HttpClientTestingModule, ArticleDetailComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ArticleService, useValue: slowService },
        { provide: AlertService, useValue: mockAlertService },
        { provide: AuthorizationService, useValue: mockAuthAdmin },
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: ActivatedRoute, useValue: makeRoute('PROD-001') },
      ],
    }).compileComponents();
  });

  it('isLoading is true while fetching', () => {
    const fixture = TestBed.createComponent(ArticleDetailComponent);
    const comp = fixture.componentInstance;
    comp.ngOnInit();
    expect(comp.isLoading).toBe(true);
  });
});
