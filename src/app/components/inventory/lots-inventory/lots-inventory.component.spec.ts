import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { LotsInventoryComponent } from './lots-inventory.component';
import { InventoryLotsService } from '../../../services/inventory-lots.service';
import { LanguageService } from '../../../services/extras/language.service';
import { InventoryLot } from '../../../models/inventory-lot.model';

function mockResponse(data: any): any {
  return Promise.resolve({ result: { success: true, message: '', endpoint_code: '' }, data, envelope: {} });
}

const MOCK_LOTS: InventoryLot[] = [
  { id: '1', lot_id: 'L1', lot_number: 'LOT-001', sku: 'SKU-A', location: 'A-01', qty: 10,
    expiration_date: new Date(Date.now() + 10 * 86400000).toISOString(), status: 'active' },
  { id: '2', lot_id: 'L2', lot_number: 'LOT-002', sku: 'SKU-B', location: 'B-02', qty: 5,
    expiration_date: new Date(Date.now() + 45 * 86400000).toISOString(), status: 'active' },
  { id: '3', lot_id: 'L3', lot_number: 'LOT-003', sku: 'SKU-C', location: 'A-01', qty: 2,
    expiration_date: new Date(Date.now() - 5 * 86400000).toISOString(), status: 'active' },
  { id: '4', lot_id: 'L4', lot_number: 'LOT-004', sku: 'SKU-D', location: 'C-03', qty: 100,
    expiration_date: null, status: 'active' },
];

describe('LotsInventoryComponent', () => {
  let component: LotsInventoryComponent;
  let fixture: ComponentFixture<LotsInventoryComponent>;
  let inventoryLotsService: jasmine.SpyObj<InventoryLotsService>;
  let languageService: jasmine.SpyObj<LanguageService>;

  beforeEach(async () => {
    inventoryLotsService = jasmine.createSpyObj('InventoryLotsService', ['getAll']);
    languageService = jasmine.createSpyObj('LanguageService', ['translate']);
    languageService.translate.and.callFake((k: string) => k);
    inventoryLotsService.getAll.and.returnValue(mockResponse(MOCK_LOTS));

    await TestBed.configureTestingModule({
      imports: [LotsInventoryComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: InventoryLotsService, useValue: inventoryLotsService },
        { provide: LanguageService, useValue: languageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LotsInventoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders lots after load', () => {
    expect(inventoryLotsService.getAll).toHaveBeenCalled();
    expect(component.filteredLots().length).toBe(4);
  });

  it('filters by SKU', () => {
    component.onSkuSearch('SKU-A');
    expect(component.filteredLots().length).toBe(1);
    expect(component.filteredLots()[0].sku).toBe('SKU-A');
  });

  it('expiry window 30d shows lots expiring within 30 days (including expired)', () => {
    component.setExpiryWindow('30d');
    // LOT-001 (10d), LOT-003 (-5d expired), lot without date excluded
    const filtered = component.filteredLots();
    expect(filtered.some(l => l.lot_number === 'LOT-001')).toBeTrue();
    expect(filtered.some(l => l.lot_number === 'LOT-003')).toBeTrue();
    expect(filtered.some(l => l.lot_number === 'LOT-002')).toBeFalse();
  });

  it('expiry window expired shows only expired lots', () => {
    component.setExpiryWindow('expired');
    const filtered = component.filteredLots();
    expect(filtered.length).toBe(1);
    expect(filtered[0].lot_number).toBe('LOT-003');
  });

  it('shows all unique locations in dropdown', () => {
    const locs = component.uniqueLocations;
    expect(locs).toContain('A-01');
    expect(locs).toContain('B-02');
    expect(locs).toContain('C-03');
  });

  it('formats null date as dash', () => {
    expect(component.formatDate(null)).toBe('—');
    expect(component.formatDate(undefined)).toBe('—');
  });
});
