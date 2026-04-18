import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { HistorialTabComponent } from './historial-tab.component';
import { InventoryMovementsService } from '@app/services/inventory-movements.service';
import { LanguageService } from '@app/services/extras/language.service';
import { InventoryMovement } from '@app/models/inventory-movement.model';

function mockResponse<T>(data: T): any {
  return Promise.resolve({ result: { success: true, message: '', endpoint_code: '' }, data });
}

const FIXED_NOW = new Date('2026-04-17T12:00:00Z');

function daysAgo(n: number): string {
  const d = new Date(FIXED_NOW);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const MOCK_MOVEMENTS: InventoryMovement[] = [
  // Same day — 3 movements
  { id: 'm1', sku: 'SKU-X', location_code: 'A-01', quantity: 10, movement_type: 'INBOUND',  created_at: daysAgo(1) },
  { id: 'm2', sku: 'SKU-X', location_code: 'A-01', quantity:  5, movement_type: 'INBOUND',  created_at: daysAgo(1) },
  { id: 'm3', sku: 'SKU-X', location_code: 'B-02', quantity:  3, movement_type: 'OUTBOUND', created_at: daysAgo(1) },
  // Another day
  { id: 'm4', sku: 'SKU-X', location_code: 'A-01', quantity:  2, movement_type: 'ADJUSTMENT', created_at: daysAgo(5) },
  { id: 'm5', sku: 'SKU-X', location_code: 'A-01', quantity:  7, movement_type: 'REJECTED',   created_at: daysAgo(15) },
];

const mockLanguageService = { translate: (k: string) => k, t: (k: string) => k };

describe('HistorialTabComponent', () => {
  let component: HistorialTabComponent;
  let fixture: ComponentFixture<HistorialTabComponent>;
  let movementsService: jasmine.SpyObj<InventoryMovementsService>;

  beforeEach(async () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(FIXED_NOW);

    movementsService = jasmine.createSpyObj('InventoryMovementsService', ['getAll']);
    movementsService.getAll.and.returnValue(mockResponse(MOCK_MOVEMENTS));

    await TestBed.configureTestingModule({
      imports: [HistorialTabComponent],
      providers: [
        provideNoopAnimations(),
        { provide: InventoryMovementsService, useValue: movementsService },
        { provide: LanguageService, useValue: mockLanguageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HistorialTabComponent);
    component = fixture.componentInstance;
    component.sku = 'SKU-X';
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('loads movements on init with sku filter', () => {
    expect(movementsService.getAll).toHaveBeenCalled();
    const call = movementsService.getAll.calls.mostRecent().args[0];
    expect(call?.sku).toBe('SKU-X');
  });

  it('aggregates movements per day in heatmap', () => {
    const cells = component.heatmapCells();
    const dayWithThree = cells.find(c => c.count === 3);
    expect(dayWithThree).toBeTruthy();
    expect(dayWithThree!.totalQty).toBe(10 + 5 + 3);
  });

  it('heatmap has one cell per day from start to today', () => {
    const cells = component.heatmapCells();
    expect(cells.length).toBeGreaterThanOrEqual(365);
    expect(cells.length).toBeLessThanOrEqual(400);
  });

  it('total movements count matches fixture', () => {
    expect(component.totalMovements()).toBe(5);
  });

  it('type filter narrows movements', () => {
    component.toggleType('INBOUND');
    expect(component.sortedMovements().length).toBe(2);
  });

  it('clicking a heatmap cell filters movements to that day', () => {
    const cell = component.heatmapCells().find(c => c.count === 3)!;
    component.onCellClick(cell);
    expect(component.dayFilter()).toBe(cell.date);
    expect(component.sortedMovements().length).toBe(3);
  });

  it('clicking the same cell twice clears the day filter', () => {
    const cell = component.heatmapCells().find(c => c.count === 3)!;
    component.onCellClick(cell);
    component.onCellClick(cell);
    expect(component.dayFilter()).toBeNull();
  });

  it('pagination respects page size', () => {
    component.pageIndex.set(0);
    expect(component.pagedMovements().length).toBeLessThanOrEqual(component.pageSize);
  });

  it('clearFilters resets state', () => {
    component.toggleType('INBOUND');
    component.onLocationChange('A-01');
    component.clearFilters();
    expect(component.selectedTypes().size).toBe(0);
    expect(component.selectedLocation()).toBe('');
    expect(component.dayFilter()).toBeNull();
  });

  it('qty display prefixes + for inbound, - for outbound', () => {
    expect(component.qtyDisplay(MOCK_MOVEMENTS[0])).toBe('+10');
    expect(component.qtyDisplay(MOCK_MOVEMENTS[2])).toBe('-3');
  });

  it('monthLabels produces at least 12 entries', () => {
    expect(component.monthLabels().length).toBeGreaterThanOrEqual(12);
  });

  it('location filter narrows movements', () => {
    component.onLocationChange('B-02');
    expect(component.sortedMovements().length).toBe(1);
  });
});
