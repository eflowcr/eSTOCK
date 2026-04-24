import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { GeneralTabComponent } from './general-tab.component';
import { LanguageService } from '@app/services/extras/language.service';
import { Article } from '@app/models/article.model';

const FULL_ARTICLE: Article = {
  id: 'art-001',
  sku: 'PROD-001',
  name: 'Producto Completo',
  description: 'Descripción de prueba',
  unit_price: 100,
  presentation: 'unit',
  track_by_lot: true,
  track_by_serial: false,
  track_expiration: true,
  rotation_strategy: 'fefo',
  min_quantity: 5,
  max_quantity: 100,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-06-01T00:00:00Z',
  category: { id: 'cat-1', name: 'Electrónica' },
  shelf_life_in_days: 365,
  safety_stock: 10,
  batch_number_series: 'LOT',
  serial_number_series: 'SER',
  min_order_qty: 20,
  default_location: { id: 'loc-1', code: 'A-01', name: 'Bodega Principal' },
  receiving_notes: 'Revisar temperatura al recibir',
  shipping_notes: 'Empacar con burbuja',
};

const MIN_ARTICLE: Article = {
  id: 'art-002',
  sku: 'PROD-002',
  name: 'Producto Mínimo',
  presentation: 'unit',
  track_by_lot: false,
  track_by_serial: false,
  track_expiration: false,
  is_active: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockLanguageService = { t: (key: string) => key };

describe('GeneralTabComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, RouterModule.forRoot([]), GeneralTabComponent],
      providers: [
        provideNoopAnimations(),
        { provide: LanguageService, useValue: mockLanguageService },
      ],
    }).compileComponents();
  });

  it('creates the component', () => {
    const fixture = TestBed.createComponent(GeneralTabComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders nothing when article is null', () => {
    const fixture = TestBed.createComponent(GeneralTabComponent);
    fixture.componentInstance.article = null;
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent?.trim()).toBe('');
  });

  it('renders all sections when article has full data', () => {
    const fixture = TestBed.createComponent(GeneralTabComponent);
    fixture.componentInstance.article = FULL_ARTICLE;
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('PROD-001');
    expect(text).toContain('Producto Completo');
    expect(text).toContain('Electrónica');
    expect(text).toContain('A-01');
    expect(text).toContain('Bodega Principal');
    expect(text).toContain('Revisar temperatura al recibir');
    expect(text).toContain('Empacar con burbuja');
  });

  it('renders em-dash placeholder for null fields', () => {
    const fixture = TestBed.createComponent(GeneralTabComponent);
    fixture.componentInstance.article = MIN_ARTICLE;
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('—');
  });

  it('shows edit button when canEdit is true', () => {
    const fixture = TestBed.createComponent(GeneralTabComponent);
    fixture.componentInstance.article = FULL_ARTICLE;
    fixture.componentInstance.canEdit = true;
    fixture.detectChanges();
    const btn = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(btn).toBeTruthy();
  });

  it('hides edit button when canEdit is false', () => {
    const fixture = TestBed.createComponent(GeneralTabComponent);
    fixture.componentInstance.article = FULL_ARTICLE;
    fixture.componentInstance.canEdit = false;
    fixture.detectChanges();
    const btn = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(btn).toBeNull();
  });

  it('emits editRequested when edit button is clicked', () => {
    const fixture = TestBed.createComponent(GeneralTabComponent);
    const comp = fixture.componentInstance;
    comp.article = FULL_ARTICLE;
    comp.canEdit = true;
    fixture.detectChanges();
    const spy = jasmine.createSpy('editRequested');
    comp.editRequested.subscribe(spy);
    const btn = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
    btn.click();
    expect(spy).toHaveBeenCalled();
  });

  it('formats batch series example with current year', () => {
    const fixture = TestBed.createComponent(GeneralTabComponent);
    fixture.componentInstance.article = FULL_ARTICLE;
    const year = new Date().getFullYear();
    expect(fixture.componentInstance.batchSeriesExample).toBe(`LOT-${year}-001`);
  });

  it('returns em-dash for batch series when not set', () => {
    const fixture = TestBed.createComponent(GeneralTabComponent);
    fixture.componentInstance.article = MIN_ARTICLE;
    expect(fixture.componentInstance.batchSeriesExample).toBe('—');
  });

  it('formats serial series example', () => {
    const fixture = TestBed.createComponent(GeneralTabComponent);
    fixture.componentInstance.article = FULL_ARTICLE;
    expect(fixture.componentInstance.serialSeriesExample).toBe('SER-0001');
  });

  it('hasValue returns false for null, undefined, empty string', () => {
    const fixture = TestBed.createComponent(GeneralTabComponent);
    const comp = fixture.componentInstance;
    expect(comp.hasValue(null)).toBe(false);
    expect(comp.hasValue(undefined)).toBe(false);
    expect(comp.hasValue('')).toBe(false);
    expect(comp.hasValue(0)).toBe(true);
    expect(comp.hasValue('x')).toBe(true);
  });

  it('formatRelative returns em-dash for null', () => {
    const fixture = TestBed.createComponent(GeneralTabComponent);
    expect(fixture.componentInstance.formatRelative(null)).toBe('—');
    expect(fixture.componentInstance.formatRelative(undefined)).toBe('—');
  });
});
