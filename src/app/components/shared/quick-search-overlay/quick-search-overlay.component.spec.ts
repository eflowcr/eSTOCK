import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { QuickSearchOverlayComponent } from './quick-search-overlay.component';
import { QuickSearchService } from '@app/services/quick-search.service';
import { LanguageService } from '@app/services/extras/language.service';
import { Router, RouterModule } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

const emptyResult = { articles: [], locations: [], lots: [], tasks: { receiving: [], picking: [] } };

describe('QuickSearchOverlayComponent', () => {
  let component: QuickSearchOverlayComponent;
  let fixture: ComponentFixture<QuickSearchOverlayComponent>;
  let searchSpy: jasmine.SpyObj<QuickSearchService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    searchSpy = jasmine.createSpyObj('QuickSearchService', ['search', 'invalidate']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const langSpy = jasmine.createSpyObj('LanguageService', ['t', 'translate']);
    langSpy.t.and.callFake((k: string) => k);
    langSpy.translate.and.callFake((k: string) => k);

    searchSpy.search.and.returnValue(Promise.resolve(emptyResult));

    await TestBed.configureTestingModule({
      imports: [
        QuickSearchOverlayComponent,
        RouterModule.forRoot([]),
        HttpClientTestingModule,
      ],
      providers: [
        provideNoopAnimations(),
        { provide: QuickSearchService, useValue: searchSpy },
        { provide: LanguageService, useValue: langSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuickSearchOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('toggles open on Cmd+K', () => {
    expect(component.open).toBeFalse();
    const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
    document.dispatchEvent(event);
    expect(component.open).toBeTrue();
  });

  it('closes on ESC key', () => {
    component.open = true;
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(event);
    expect(component.open).toBeFalse();
  });

  it('resets state on close', () => {
    component.open = true;
    component.query = 'test';
    component.close();
    expect(component.query).toBe('');
    expect(component.open).toBeFalse();
  });

  it('debounces search query — does not call service immediately', fakeAsync(() => {
    component.open = true;
    component.onQueryChange('abc');
    expect(searchSpy.search).not.toHaveBeenCalled();
    tick(200);
    expect(searchSpy.search).toHaveBeenCalledWith('abc');
  }));

  it('does not call search for empty query', fakeAsync(() => {
    component.open = true;
    component.onQueryChange('');
    tick(300);
    expect(searchSpy.search).not.toHaveBeenCalled();
  }));

  it('moves activeIndex down with ArrowDown', () => {
    (component as any).flatItems = [
      { kind: 'article', data: {} },
      { kind: 'article', data: {} },
    ];
    component.activeIndex = 0;
    component.moveActive(1);
    expect(component.activeIndex).toBe(1);
  });

  it('wraps around at bottom with ArrowDown', () => {
    (component as any).flatItems = [{ kind: 'article', data: {} }, { kind: 'article', data: {} }];
    component.activeIndex = 1;
    component.moveActive(1);
    expect(component.activeIndex).toBe(0);
  });

  it('navigates to /articles/:sku on article click', () => {
    const article = { id: '1', sku: 'ABC-001', name: 'Test', presentation: 'u', track_by_lot: false, track_by_serial: false, track_expiration: false, created_at: '', updated_at: '' };
    component.navigate({ kind: 'article', data: article });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/articles', 'ABC-001']);
  });

  it('navigates to /inventory with location query on location click', () => {
    const loc = { id: 1, location_code: 'A-01', type: 'rack', is_active: true, created_at: '', updated_at: '' };
    component.navigate({ kind: 'location', data: loc });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/inventory'], { queryParams: { location: 'A-01' } });
  });
});
