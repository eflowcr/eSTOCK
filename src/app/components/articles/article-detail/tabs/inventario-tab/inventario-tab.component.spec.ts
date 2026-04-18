import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { InventarioTabComponent } from './inventario-tab.component';
import { InventoryService } from '@app/services/inventory.service';
import { InventoryLotsService } from '@app/services/inventory-lots.service';
import { InventoryValuationService } from '@app/services/inventory-valuation.service';
import { PickingTaskService } from '@app/services/picking-task.service';
import { ReceivingTaskService } from '@app/services/receiving-task.service';
import { AlertService } from '@app/services/extras/alert.service';
import { AuthorizationService } from '@app/services/extras/authorization.service';
import { LanguageService } from '@app/services/extras/language.service';

const SKU = 'PROD-001';

const okResponse = (data: any) => Promise.resolve({
  envelope: { transaction_type: '', encrypted: false, encryption_type: '' },
  result: { success: true, message: '', endpoint_code: '' },
  data,
});

const MOCK_INVENTORY = [
  { id: 1, sku: SKU, name: 'P1', location: 'A-01', quantity: 100, status: 'active', presentation: 'unit', reserved_qty: 10, available_qty: 90, track_by_lot: true, track_by_serial: false, track_expiration: true, created_at: '2024-01-01', updated_at: '2024-01-01', lots: [{ id: 1, lotNumber: 'L1', sku: SKU, quantity: 60, created_at: '', updated_at: '' }] },
  { id: 2, sku: SKU, name: 'P1', location: 'A-02', quantity: 50, status: 'active', presentation: 'unit', reserved_qty: 0, available_qty: 50, track_by_lot: true, track_by_serial: false, track_expiration: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 3, sku: 'OTHER', name: 'P2', location: 'B-01', quantity: 999, status: 'active', presentation: 'unit', reserved_qty: 0, available_qty: 999, track_by_lot: false, track_by_serial: false, track_expiration: false, created_at: '2024-01-01', updated_at: '2024-01-01' },
];

const MOCK_VALUATION = {
  total_value: 50000,
  group_by: 'article',
  breakdown: [
    { id: 'a1', label: SKU, total_value: 12500, quantity: 150 },
    { id: 'a2', label: 'OTHER', total_value: 37500, quantity: 999 },
  ],
};

const MOCK_PICKINGS = [
  { id: 'pt-1', task_id: 'PT-001', created_by: 'u', assigned_to: 'u', status: 'open', priority: 'normal', items: [{ sku: SKU, required_qty: 10, allocations: [{ location: 'A-01', quantity: 10 }] }], created_at: '2024-06-01', updated_at: '2024-06-01' },
  { id: 'pt-2', task_id: 'PT-002', created_by: 'u', assigned_to: 'u', status: 'completed', priority: 'normal', items: [{ sku: SKU, required_qty: 5, allocations: [] }], created_at: '2024-06-01', updated_at: '2024-06-01' },
  { id: 'pt-3', task_id: 'PT-003', created_by: 'u', assigned_to: 'u', status: 'in_progress', priority: 'high', items: [{ sku: 'OTHER', required_qty: 20, allocations: [] }], created_at: '2024-06-01', updated_at: '2024-06-01' },
];

const MOCK_RECEIVINGS = [
  { id: 1, task_id: 'RT-001', inbound_number: 'IN-001', created_by: 'u', assigned_to: 'u', status: 'open', priority: 'normal', items: [{ sku: SKU, expected_qty: 30, received_qty: 0, location: 'A-01' }], created_at: '2024-06-01', updated_at: '2024-06-01' },
];

const MOCK_LOTS = [
  { id: 'il-1', lot_id: 'l1', lot_number: 'LOT-A', sku: SKU, location: 'A-01', qty: 40, expiration_date: '2026-06-01', status: 'active' },
  { id: 'il-2', lot_id: 'l2', lot_number: 'LOT-B', sku: SKU, location: 'A-02', qty: 0, expiration_date: null, status: 'active' },
];

function makeMocks(overrides: Partial<{ cancel: any; valuation: any; picking: any; receiving: any }> = {}) {
  return {
    inventoryService: { getAll: () => okResponse(MOCK_INVENTORY) },
    inventoryLotsService: { getAll: () => okResponse(MOCK_LOTS) },
    valuationService: { get: () => overrides.valuation ?? okResponse(MOCK_VALUATION) },
    pickingTaskService: {
      getAll: () => overrides.picking ?? okResponse(MOCK_PICKINGS),
      cancel: overrides.cancel ?? jasmine.createSpy('cancel').and.returnValue(okResponse({})),
    },
    receivingTaskService: { getAll: () => overrides.receiving ?? okResponse(MOCK_RECEIVINGS) },
    alertService: { success: jasmine.createSpy('success'), error: jasmine.createSpy('error') },
    authorizationService: { isAdmin: () => true, hasPermission: () => true },
    languageService: { t: (k: string) => k },
  };
}

function configure(mocks: ReturnType<typeof makeMocks>) {
  return TestBed.configureTestingModule({
    imports: [CommonModule, RouterModule.forRoot([]), InventarioTabComponent],
    providers: [
      provideNoopAnimations(),
      { provide: InventoryService, useValue: mocks.inventoryService },
      { provide: InventoryLotsService, useValue: mocks.inventoryLotsService },
      { provide: InventoryValuationService, useValue: mocks.valuationService },
      { provide: PickingTaskService, useValue: mocks.pickingTaskService },
      { provide: ReceivingTaskService, useValue: mocks.receivingTaskService },
      { provide: AlertService, useValue: mocks.alertService },
      { provide: AuthorizationService, useValue: mocks.authorizationService },
      { provide: LanguageService, useValue: mocks.languageService },
    ],
  }).compileComponents();
}

describe('InventarioTabComponent', () => {
  it('creates the component', async () => {
    await configure(makeMocks());
    const fixture = TestBed.createComponent(InventarioTabComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('loads inventory filtered by sku, sorted by qty desc', fakeAsync(async () => {
    await configure(makeMocks());
    const fixture = TestBed.createComponent(InventarioTabComponent);
    fixture.componentInstance.sku = SKU;
    fixture.componentInstance.ngOnInit();
    tick();
    expect(fixture.componentInstance.inventory.length).toBe(2);
    expect(fixture.componentInstance.inventory[0].quantity).toBe(100);
    expect(fixture.componentInstance.inventory[1].quantity).toBe(50);
  }));

  it('computes availableStock from sum of available_qty', fakeAsync(async () => {
    await configure(makeMocks());
    const fixture = TestBed.createComponent(InventarioTabComponent);
    fixture.componentInstance.sku = SKU;
    fixture.componentInstance.ngOnInit();
    tick();
    expect(fixture.componentInstance.availableStock).toBe(140);
  }));

  it('finds AVCO value from valuation breakdown', fakeAsync(async () => {
    await configure(makeMocks());
    const fixture = TestBed.createComponent(InventarioTabComponent);
    fixture.componentInstance.sku = SKU;
    fixture.componentInstance.ngOnInit();
    tick();
    expect(fixture.componentInstance.avcoValue).toBe(12500);
  }));

  it('computes projectedQty = available + incoming', fakeAsync(async () => {
    await configure(makeMocks());
    const fixture = TestBed.createComponent(InventarioTabComponent);
    fixture.componentInstance.sku = SKU;
    fixture.componentInstance.ngOnInit();
    tick();
    expect(fixture.componentInstance.projectedQty).toBe(170);
  }));

  it('filters active reservations only', fakeAsync(async () => {
    await configure(makeMocks());
    const fixture = TestBed.createComponent(InventarioTabComponent);
    fixture.componentInstance.sku = SKU;
    fixture.componentInstance.ngOnInit();
    tick();
    expect(fixture.componentInstance.reservations.length).toBe(1);
    expect(fixture.componentInstance.reservations[0].task.task_id).toBe('PT-001');
    expect(fixture.componentInstance.reservations[0].reservedQty).toBe(10);
    expect(fixture.componentInstance.reservations[0].locations).toContain('A-01');
  }));

  it('filters lots with qty > 0 and sorts by expiration', fakeAsync(async () => {
    await configure(makeMocks());
    const fixture = TestBed.createComponent(InventarioTabComponent);
    fixture.componentInstance.sku = SKU;
    fixture.componentInstance.ngOnInit();
    tick();
    expect(fixture.componentInstance.lots.length).toBe(1);
    expect(fixture.componentInstance.lots[0].lot_number).toBe('LOT-A');
  }));

  it('sets hasError when a service throws', fakeAsync(async () => {
    const mocks = makeMocks();
    mocks.inventoryService.getAll = () => Promise.reject(new Error('boom'));
    await configure(mocks);
    const fixture = TestBed.createComponent(InventarioTabComponent);
    fixture.componentInstance.sku = SKU;
    fixture.componentInstance.ngOnInit();
    tick();
    expect(fixture.componentInstance.hasError).toBe(true);
    expect(mocks.alertService.error).toHaveBeenCalled();
  }));

  it('openReleaseConfirm sets pending taskId and opens dialog', async () => {
    await configure(makeMocks());
    const fixture = TestBed.createComponent(InventarioTabComponent);
    fixture.componentInstance.openReleaseConfirm('pt-1');
    expect(fixture.componentInstance.confirmOpen).toBe(true);
    expect(fixture.componentInstance.pendingReleaseTaskId).toBe('pt-1');
  });

  it('cancelRelease closes dialog and clears pending', async () => {
    await configure(makeMocks());
    const fixture = TestBed.createComponent(InventarioTabComponent);
    fixture.componentInstance.openReleaseConfirm('pt-1');
    fixture.componentInstance.cancelRelease();
    expect(fixture.componentInstance.confirmOpen).toBe(false);
    expect(fixture.componentInstance.pendingReleaseTaskId).toBeNull();
  });

  it('confirmRelease calls pickingTaskService.cancel and reloads', fakeAsync(async () => {
    const mocks = makeMocks();
    const cancelSpy = jasmine.createSpy('cancel').and.returnValue(okResponse({}));
    mocks.pickingTaskService.cancel = cancelSpy;
    await configure(mocks);
    const fixture = TestBed.createComponent(InventarioTabComponent);
    fixture.componentInstance.sku = SKU;
    fixture.componentInstance.openReleaseConfirm('pt-1');
    fixture.componentInstance.confirmRelease();
    tick();
    expect(cancelSpy).toHaveBeenCalledWith('pt-1');
    expect(mocks.alertService.success).toHaveBeenCalled();
  }));

  it('confirmRelease shows error when cancel fails', fakeAsync(async () => {
    const mocks = makeMocks();
    mocks.pickingTaskService.cancel = () => Promise.reject(new Error('fail'));
    await configure(mocks);
    const fixture = TestBed.createComponent(InventarioTabComponent);
    fixture.componentInstance.sku = SKU;
    fixture.componentInstance.openReleaseConfirm('pt-1');
    fixture.componentInstance.confirmRelease();
    tick();
    expect(mocks.alertService.error).toHaveBeenCalled();
  }));

  it('onViewAllLots emits switchTab with trazabilidad', async () => {
    await configure(makeMocks());
    const fixture = TestBed.createComponent(InventarioTabComponent);
    const spy = jasmine.createSpy('switchTab');
    fixture.componentInstance.switchTab.subscribe(spy);
    fixture.componentInstance.onViewAllLots();
    expect(spy).toHaveBeenCalledWith('trazabilidad');
  });

  it('canReleaseReservation returns true for admin', async () => {
    await configure(makeMocks());
    const fixture = TestBed.createComponent(InventarioTabComponent);
    expect(fixture.componentInstance.canReleaseReservation()).toBe(true);
  });

  it('formatCurrency returns em-dash for null', async () => {
    await configure(makeMocks());
    const fixture = TestBed.createComponent(InventarioTabComponent);
    expect(fixture.componentInstance.formatCurrency(null)).toBe('—');
  });

  it('renders stock empty state when no inventory', fakeAsync(async () => {
    const mocks = makeMocks();
    mocks.inventoryService.getAll = () => okResponse([]);
    await configure(mocks);
    const fixture = TestBed.createComponent(InventarioTabComponent);
    fixture.componentInstance.sku = SKU;
    fixture.componentInstance.ngOnInit();
    tick();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('article_detail.inventario.stock_empty');
  }));
});
