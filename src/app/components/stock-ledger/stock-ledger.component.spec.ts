import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StockLedgerComponent } from './stock-ledger.component';
import { InventoryMovementsService } from '@app/services/inventory-movements.service';
import { LanguageService } from '@app/services/extras/language.service';
import { RouterModule } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

function makeMovement(overrides: Partial<any> = {}): any {
  return {
    id: 'mv-1',
    sku: 'ABC-001',
    location_code: 'A-01',
    quantity: 10,
    movement_type: 'INBOUND',
    reference_type: 'receiving_task',
    reference_id: 'rt-001',
    created_at: '2026-04-15T10:00:00Z',
    ...overrides,
  };
}

describe('StockLedgerComponent', () => {
  let component: StockLedgerComponent;
  let fixture: ComponentFixture<StockLedgerComponent>;
  let movementsSpy: jasmine.SpyObj<InventoryMovementsService>;

  beforeEach(async () => {
    movementsSpy = jasmine.createSpyObj('InventoryMovementsService', ['getAll']);
    const langSpy = jasmine.createSpyObj('LanguageService', ['t', 'translate']);
    langSpy.t.and.callFake((k: string) => k);
    langSpy.translate.and.callFake((k: string) => k);

    movementsSpy.getAll.and.returnValue(
      Promise.resolve({ result: { success: true, endpoint_code: '' }, data: [makeMovement()] } as any),
    );

    await TestBed.configureTestingModule({
      imports: [StockLedgerComponent, RouterModule.forRoot([])],
      providers: [
        provideNoopAnimations(),
        { provide: InventoryMovementsService, useValue: movementsSpy },
        { provide: LanguageService, useValue: langSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StockLedgerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('loads movements on init', async () => {
    expect(movementsSpy.getAll).toHaveBeenCalledWith({ limit: 5000 });
    expect(component.allMovements().length).toBe(1);
  });

  it('filters by SKU', () => {
    component.allMovements.set([
      makeMovement({ sku: 'ABC-001' }),
      makeMovement({ id: 'mv-2', sku: 'XYZ-999' }),
    ]);
    component.filterSku = 'ABC';
    expect(component.filteredMovements().length).toBe(1);
    expect(component.filteredMovements()[0].sku).toBe('ABC-001');
  });

  it('filters by movement type', () => {
    component.allMovements.set([
      makeMovement({ movement_type: 'INBOUND' }),
      makeMovement({ id: 'mv-2', movement_type: 'OUTBOUND' }),
    ]);
    component.selectedTypes.set(new Set(['INBOUND']));
    expect(component.filteredMovements().length).toBe(1);
    expect(component.filteredMovements()[0].movement_type).toBe('INBOUND');
  });

  it('filters by date range', () => {
    component.allMovements.set([
      makeMovement({ created_at: '2026-04-10T10:00:00Z' }),
      makeMovement({ id: 'mv-2', created_at: '2026-04-20T10:00:00Z' }),
    ]);
    component.filterFrom = '2026-04-15';
    component.filterTo = '2026-04-25';
    expect(component.filteredMovements().length).toBe(1);
  });

  it('filters by reference type', () => {
    component.allMovements.set([
      makeMovement({ reference_type: 'receiving_task' }),
      makeMovement({ id: 'mv-2', reference_type: 'picking_task' }),
    ]);
    component.filterRefType = 'picking_task';
    expect(component.filteredMovements().length).toBe(1);
  });

  it('clears all filters', () => {
    component.filterSku = 'abc';
    component.filterFrom = '2026-01-01';
    component.selectedTypes.set(new Set(['INBOUND']));
    component.clearFilters();
    expect(component.filterSku).toBe('');
    expect(component.filterFrom).toBe('');
    expect(component.selectedTypes().size).toBe(0);
  });

  it('paginates correctly', () => {
    const many = Array.from({ length: 45 }, (_, i) =>
      makeMovement({ id: `mv-${i}`, created_at: `2026-04-${String(i + 1).padStart(2, '0')}T10:00:00Z` }),
    );
    component.allMovements.set(many);
    component.pageIndex.set(0);
    expect(component.pagedMovements().length).toBe(20);
    expect(component.totalPages()).toBe(3);
  });

  it('generates correct CSV escape for values with commas', () => {
    const escape = (v: unknown): string => {
      const s = v == null ? '' : String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    expect(escape('hello, world')).toBe('"hello, world"');
    expect(escape('say "hi"')).toBe('"say ""hi"""');
    expect(escape('normal')).toBe('normal');
  });
});
