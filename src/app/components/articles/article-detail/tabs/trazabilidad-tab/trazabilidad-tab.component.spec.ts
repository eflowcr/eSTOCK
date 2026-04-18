import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TrazabilidadTabComponent } from './trazabilidad-tab.component';
import { LotService } from '@app/services/lot.service';
import { InventoryLotsService } from '@app/services/inventory-lots.service';
import { SerialService } from '@app/services/serial.service';
import { LanguageService } from '@app/services/extras/language.service';
import { Lot } from '@app/models/lot.model';
import { InventoryLot } from '@app/models/inventory-lot.model';
import { Serial } from '@app/models/serial.model';

function mockResponse<T>(data: T): any {
  return Promise.resolve({ result: { success: true, message: '', endpoint_code: '' }, data });
}

function plusDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

const MOCK_LOTS: Lot[] = [
  { id: 1, lot_number: 'LOT-A', sku: 'SKU-X', quantity: 100, expiration_date: plusDays(10),   created_at: '', updated_at: '' },
  { id: 2, lot_number: 'LOT-B', sku: 'SKU-X', quantity:   0, expiration_date: plusDays(60),   created_at: '', updated_at: '' },
  { id: 3, lot_number: 'LOT-C', sku: 'SKU-X', quantity:  50, expiration_date: plusDays(-5),   created_at: '', updated_at: '' },
];

const MOCK_INV_LOTS: InventoryLot[] = [
  { id: 'i1', lot_id: '1', lot_number: 'LOT-A', sku: 'SKU-X', location: 'A-01', qty: 60, expiration_date: plusDays(10),  status: 'active' },
  { id: 'i2', lot_id: '1', lot_number: 'LOT-A', sku: 'SKU-X', location: 'B-02', qty: 40, expiration_date: plusDays(10),  status: 'active' },
  { id: 'i3', lot_id: '3', lot_number: 'LOT-C', sku: 'SKU-X', location: 'A-01', qty: 50, expiration_date: plusDays(-5),  status: 'active' },
];

const MOCK_SERIALS: Serial[] = [
  { id: 10, serial_number: 'SN-1', sku: 'SKU-X', status: 'available', created_at: '', updated_at: '' },
  { id: 11, serial_number: 'SN-2', sku: 'SKU-X', status: 'shipped',   created_at: '', updated_at: '' },
];

const mockLanguageService = { translate: (k: string) => k };

describe('TrazabilidadTabComponent', () => {
  let component: TrazabilidadTabComponent;
  let fixture: ComponentFixture<TrazabilidadTabComponent>;
  let lotService: jasmine.SpyObj<LotService>;
  let inventoryLotsService: jasmine.SpyObj<InventoryLotsService>;
  let serialService: jasmine.SpyObj<SerialService>;

  beforeEach(async () => {
    lotService = jasmine.createSpyObj('LotService', ['getBySku']);
    inventoryLotsService = jasmine.createSpyObj('InventoryLotsService', ['getAll']);
    serialService = jasmine.createSpyObj('SerialService', ['getBySku']);

    lotService.getBySku.and.returnValue(mockResponse(MOCK_LOTS));
    inventoryLotsService.getAll.and.returnValue(mockResponse(MOCK_INV_LOTS));
    serialService.getBySku.and.returnValue(mockResponse(MOCK_SERIALS));

    await TestBed.configureTestingModule({
      imports: [TrazabilidadTabComponent],
      providers: [
        provideNoopAnimations(),
        { provide: LotService, useValue: lotService },
        { provide: InventoryLotsService, useValue: inventoryLotsService },
        { provide: SerialService, useValue: serialService },
        { provide: LanguageService, useValue: mockLanguageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TrazabilidadTabComponent);
    component = fixture.componentInstance;
    component.sku = 'SKU-X';
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('loads lots + inventoryLots on init', () => {
    expect(lotService.getBySku).toHaveBeenCalledWith('SKU-X');
    expect(inventoryLotsService.getAll).toHaveBeenCalledWith({ sku: 'SKU-X' });
  });

  it('does not load serials when isSerialized=false', () => {
    expect(serialService.getBySku).not.toHaveBeenCalled();
  });

  it('lotRows aggregates qty from inventoryLots by lot_number', () => {
    const rows = component.lotRows();
    const lotA = rows.find(r => r.lot_number === 'LOT-A')!;
    expect(lotA.totalQty).toBe(100);
    expect(lotA.locations.sort()).toEqual(['A-01', 'B-02']);
  });

  it('default status=active filters out archived (qty=0 or expired)', () => {
    const filtered = component.filteredLots();
    const lotNumbers = filtered.map(r => r.lot_number);
    expect(lotNumbers).toContain('LOT-A');
    expect(lotNumbers).not.toContain('LOT-B');
    expect(lotNumbers).not.toContain('LOT-C');
  });

  it('status=archived shows only archived lots', () => {
    component.setStatus('archived');
    const filtered = component.filteredLots();
    const lotNumbers = filtered.map(r => r.lot_number);
    expect(lotNumbers).toContain('LOT-B');
    expect(lotNumbers).toContain('LOT-C');
    expect(lotNumbers).not.toContain('LOT-A');
  });

  it('status=all shows everything', () => {
    component.setStatus('all');
    expect(component.filteredLots().length).toBe(3);
  });

  it('expiry=expired shows only expired (independent of status)', () => {
    component.setStatus('all');
    component.setExpiry('expired');
    const filtered = component.filteredLots();
    expect(filtered.length).toBe(1);
    expect(filtered[0].lot_number).toBe('LOT-C');
  });

  it('default sort is expiration ASC', () => {
    component.setStatus('all');
    const rows = component.filteredLots();
    // LOT-C (-5d) before LOT-A (+10d) before LOT-B (+60d)
    expect(rows[0].lot_number).toBe('LOT-C');
  });

  it('toggleSort flips order', () => {
    component.setStatus('all');
    component.toggleSort();
    const rows = component.filteredLots();
    expect(rows[0].lot_number).toBe('LOT-B');
  });

  it('hasSerials is false when isSerialized=false', () => {
    expect(component.hasSerials()).toBeFalse();
  });
});

describe('TrazabilidadTabComponent — with serials', () => {
  let component: TrazabilidadTabComponent;
  let fixture: ComponentFixture<TrazabilidadTabComponent>;

  beforeEach(async () => {
    const lotService = jasmine.createSpyObj('LotService', ['getBySku']);
    const inventoryLotsService = jasmine.createSpyObj('InventoryLotsService', ['getAll']);
    const serialService = jasmine.createSpyObj('SerialService', ['getBySku']);
    lotService.getBySku.and.returnValue(mockResponse([]));
    inventoryLotsService.getAll.and.returnValue(mockResponse([]));
    serialService.getBySku.and.returnValue(mockResponse(MOCK_SERIALS));

    await TestBed.configureTestingModule({
      imports: [TrazabilidadTabComponent],
      providers: [
        provideNoopAnimations(),
        { provide: LotService, useValue: lotService },
        { provide: InventoryLotsService, useValue: inventoryLotsService },
        { provide: SerialService, useValue: serialService },
        { provide: LanguageService, useValue: mockLanguageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TrazabilidadTabComponent);
    component = fixture.componentInstance;
    component.sku = 'SKU-X';
    component.isSerialized = true;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('loads serials when isSerialized=true', () => {
    expect(component.serials().length).toBe(2);
    expect(component.hasSerials()).toBeTrue();
  });
});
