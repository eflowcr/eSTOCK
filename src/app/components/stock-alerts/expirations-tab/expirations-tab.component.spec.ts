import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ExpirationsTabComponent } from './expirations-tab.component';
import { InventoryLotsService } from '../../../services/inventory-lots.service';
import { InventoryLot } from '../../../models/inventory-lot.model';

function mockResponse(data: any): any {
  return Promise.resolve({ result: { success: true, message: '', endpoint_code: '' }, data, envelope: {} });
}

const MOCK_LOTS: InventoryLot[] = [
  { id: '1', lot_id: 'L1', lot_number: 'LOT-001', sku: 'SKU-A', location: 'A-01', qty: 10,
    expiration_date: new Date(Date.now() + 5 * 86400000).toISOString(), status: 'active' },
  { id: '2', lot_id: 'L2', lot_number: 'LOT-002', sku: 'SKU-B', location: 'B-02', qty: 5,
    expiration_date: new Date(Date.now() + 45 * 86400000).toISOString(), status: 'active' },
  { id: '3', lot_id: 'L3', lot_number: 'LOT-003', sku: 'SKU-C', location: 'A-01', qty: 2,
    expiration_date: new Date(Date.now() - 10 * 86400000).toISOString(), status: 'active' },
  { id: '4', lot_id: 'L4', lot_number: 'LOT-004', sku: 'SKU-D', location: 'C-03', qty: 100,
    expiration_date: null, status: 'active' },
];

describe('ExpirationsTabComponent', () => {
  let component: ExpirationsTabComponent;
  let fixture: ComponentFixture<ExpirationsTabComponent>;
  let inventoryLotsService: jasmine.SpyObj<InventoryLotsService>;

  beforeEach(async () => {
    inventoryLotsService = jasmine.createSpyObj('InventoryLotsService', ['getAll']);
    inventoryLotsService.getAll.and.returnValue(mockResponse(MOCK_LOTS));

    await TestBed.configureTestingModule({
      imports: [ExpirationsTabComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: InventoryLotsService, useValue: inventoryLotsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpirationsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('default window 30d shows lots expiring within 30 days + expired', () => {
    // LOT-001 (5d), LOT-003 (-10d), LOT-004 (null) excluded, LOT-002 (45d) excluded
    const filtered = component.filteredLots();
    expect(filtered.some(l => l.lot_number === 'LOT-001')).toBeTrue();
    expect(filtered.some(l => l.lot_number === 'LOT-003')).toBeTrue();
    expect(filtered.some(l => l.lot_number === 'LOT-002')).toBeFalse();
    expect(filtered.some(l => l.lot_number === 'LOT-004')).toBeFalse();
  });

  it('window 7d shows only lots expiring within 7 days', () => {
    component.setWindow('7d');
    const filtered = component.filteredLots();
    expect(filtered.some(l => l.lot_number === 'LOT-001')).toBeTrue(); // 5d
    expect(filtered.some(l => l.lot_number === 'LOT-003')).toBeTrue(); // expired
    expect(filtered.some(l => l.lot_number === 'LOT-002')).toBeFalse(); // 45d
  });

  it('window expired shows only expired lots', () => {
    component.setWindow('expired');
    const filtered = component.filteredLots();
    expect(filtered.length).toBe(1);
    expect(filtered[0].lot_number).toBe('LOT-003');
  });

  it('expiredCount counts correctly', () => {
    expect(component.expiredCount()).toBe(1);
  });

  it('urgentCount (<=7d) counts correctly', () => {
    expect(component.urgentCount()).toBe(1); // LOT-001 (5d)
  });

  it('default sort is expiration ASC (soonest first)', () => {
    component.setWindow('all');
    const filtered = component.filteredLots();
    // expired (LOT-003) should come before lot with future date (LOT-001) then (LOT-002)
    const expiringIdx = filtered.findIndex(l => l.lot_number === 'LOT-003');
    const soonIdx = filtered.findIndex(l => l.lot_number === 'LOT-001');
    if (expiringIdx >= 0 && soonIdx >= 0) {
      expect(expiringIdx).toBeLessThan(soonIdx);
    }
  });
});
