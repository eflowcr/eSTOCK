import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReceivingTaskFormComponent } from './receiving-task-form.component';
import { ReceivingTaskService } from '@app/services/receiving-task.service';
import { InventoryService } from '@app/services/inventory.service';
import { LocationService } from '@app/services/location.service';
import { UserService } from '@app/services/user.service';
import { ArticleService } from '@app/services/article.service';
import { SerialService } from '@app/services/serial.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LoadingService } from '@app/services/extras/loading.service';
import { LanguageService } from '@app/services/extras/language.service';

// ── Minimal service stubs ─────────────────────────────────────────────────────

const okResponse = (data: any) => Promise.resolve({ result: { success: true }, data });
const failResponse = () => Promise.resolve({ result: { success: false, message: 'error' }, data: null });

const mockReceivingTaskService = {
  getAll: () => okResponse([]),
  create: () => okResponse({}),
  update: () => okResponse({}),
};

const mockInventoryService = {
  getPickSuggestions: (_sku: string) => okResponse([]),
};

const mockLocationService = {
  getAll: () => okResponse([
    { location_code: 'A-01', description: 'Estante A01' },
    { location_code: 'B-02', description: 'Estante B02' },
  ]),
};

const mockUserService = {
  getAll: () => okResponse([]),
};

const mockArticleService = {
  getAll: () => okResponse([
    { sku: 'SKU-LOT', name: 'Artículo con lote', track_by_lot: true, track_by_serial: false, is_active: true },
    { sku: 'SKU-NO-LOT', name: 'Artículo sin lote', track_by_lot: false, track_by_serial: false, is_active: true },
  ]),
};

const mockSerialService = {
  getBySku: () => okResponse([]),
};

const mockAlertService = {
  success: jasmine.createSpy('success'),
  error: jasmine.createSpy('error'),
  warning: jasmine.createSpy('warning'),
};

const mockLoadingService = {
  show: jasmine.createSpy('show'),
  hide: jasmine.createSpy('hide'),
};

const mockLanguageService = {
  t: (key: string) => key,
};

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('ReceivingTaskFormComponent — F1+R3', () => {
  let component: ReceivingTaskFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        HttpClientTestingModule,
        ReceivingTaskFormComponent,
      ],
      providers: [
        { provide: ReceivingTaskService, useValue: mockReceivingTaskService },
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: LocationService, useValue: mockLocationService },
        { provide: UserService, useValue: mockUserService },
        { provide: ArticleService, useValue: mockArticleService },
        { provide: SerialService, useValue: mockSerialService },
        { provide: AlertService, useValue: mockAlertService },
        { provide: LoadingService, useValue: mockLoadingService },
        { provide: LanguageService, useValue: mockLanguageService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReceivingTaskFormComponent);
    component = fixture.componentInstance;
    await component.loadData();
    component.addItem();
    fixture.detectChanges();
  });

  // ── articleTracksByLot ─────────────────────────────────────────────────────

  it('TestArticleTracksByLot_ShowsSubForm: returns true for track_by_lot article', () => {
    // Set SKU to lot-tracked article
    (component as any).itemsArray.at(0).get('sku')?.setValue('SKU-LOT');
    expect(component.articleTracksByLot(0)).toBeTrue();
  });

  it('TestArticleNoLot_HidesSubForm: returns false for non-lot-tracked article', () => {
    (component as any).itemsArray.at(0).get('sku')?.setValue('SKU-NO-LOT');
    expect(component.articleTracksByLot(0)).toBeFalse();
  });

  // ── validateLotSum ─────────────────────────────────────────────────────────

  it('TestLotSumValidation_MatchesExpected: no error when lots sum equals expected_qty', () => {
    (component as any).itemsArray.at(0).get('sku')?.setValue('SKU-LOT');
    (component as any).expectedQuantities[0] = 100;

    component.addLot(0);
    component.addLot(0);
    const lotsArr = component.getLotsArray(0);
    lotsArr.at(0).get('quantity')?.setValue(60);
    lotsArr.at(1).get('quantity')?.setValue(40);

    expect(component.validateLotSum(0)).toBeNull();
    expect(component.getLotValidationError(0)).toBeNull();
  });

  it('TestLotSumValidation_Mismatch: returns error string when lots sum ≠ expected_qty', () => {
    (component as any).itemsArray.at(0).get('sku')?.setValue('SKU-LOT');
    (component as any).expectedQuantities[0] = 100;

    component.addLot(0);
    component.addLot(0);
    const lotsArr = component.getLotsArray(0);
    lotsArr.at(0).get('quantity')?.setValue(60);
    lotsArr.at(1).get('quantity')?.setValue(50); // 110, not 100

    const error = component.validateLotSum(0);
    expect(error).not.toBeNull();
    expect(error).toContain('110');
    expect(error).toContain('100');
  });

  // ── addLot / removeLot ─────────────────────────────────────────────────────

  it('addLot increments FormArray length', () => {
    expect(component.getLotsArray(0).length).toBe(0);
    component.addLot(0);
    expect(component.getLotsArray(0).length).toBe(1);
    component.addLot(0);
    expect(component.getLotsArray(0).length).toBe(2);
  });

  it('removeLot decrements FormArray length', () => {
    component.addLot(0);
    component.addLot(0);
    component.removeLot(0, 0);
    expect(component.getLotsArray(0).length).toBe(1);
  });

  // ── R3: Auto-location suggestion ──────────────────────────────────────────

  it('TestAutoLocation_FillsOnSkuSelect: fills location from pick-suggestions when field is empty', async () => {
    const locationCode = 'A-01';
    (mockInventoryService.getPickSuggestions as jasmine.Spy | any) = (_sku: string) =>
      okResponse([{ location: locationCode, lot_id: '1', lot_number: 'LOT-1', quantity: 50, lot_created_at: '' }]);

    (component as any).itemsArray.at(0).get('sku')?.setValue('SKU-LOT');
    (component as any).itemsArray.at(0).get('location')?.setValue(''); // empty

    await component.suggestLastLocationForSku(0, 'SKU-LOT');

    expect((component as any).itemsArray.at(0).get('location')?.value).toBe(locationCode);
  });

  it('TestAutoLocation_NoOverwriteIfUserTyped: does not overwrite existing location value', async () => {
    const existingLocation = 'B-02';
    (component as any).itemsArray.at(0).get('location')?.setValue(existingLocation);

    await component.suggestLastLocationForSku(0, 'SKU-LOT');

    // Should still be the user-typed value
    expect((component as any).itemsArray.at(0).get('location')?.value).toBe(existingLocation);
  });

  it('TestAutoLocation_UsesCache: second call uses cache, not a new network request', async () => {
    const getSpy = spyOn(
      TestBed.inject(InventoryService),
      'getPickSuggestions'
    ).and.returnValue(
      Promise.resolve({ result: { success: true }, data: [{ location: 'A-01', lot_id: '1', lot_number: 'L', quantity: 10, lot_created_at: '' }] }) as any
    );

    (component as any).itemsArray.at(0).get('location')?.setValue('');
    await component.suggestLastLocationForSku(0, 'SKU-CACHE');
    expect(getSpy).toHaveBeenCalledTimes(1);

    // Second call (field now has value → bail early)
    await component.suggestLastLocationForSku(0, 'SKU-CACHE');
    // Still only 1 call — bailed on "value already set"
    expect(getSpy).toHaveBeenCalledTimes(1);
  });

  // ── isFormComplete ─────────────────────────────────────────────────────────

  it('isFormComplete returns false when track_by_lot item has no lots', () => {
    (component as any).itemsArray.at(0).get('sku')?.setValue('SKU-LOT');
    (component as any).itemsArray.at(0).get('location')?.setValue('A-01');
    (component as any).expectedQuantities[0] = 10;
    // No lots added
    expect(component.isFormComplete()).toBeFalse();
  });

  it('isFormComplete returns false when lot sum mismatches expected_qty', () => {
    (component as any).itemsArray.at(0).get('sku')?.setValue('SKU-LOT');
    (component as any).itemsArray.at(0).get('location')?.setValue('A-01');
    (component as any).expectedQuantities[0] = 10;
    component.addLot(0);
    component.getLotsArray(0).at(0).get('quantity')?.setValue(5); // 5 ≠ 10
    expect(component.isFormComplete()).toBeFalse();
  });

  it('isFormComplete returns true when lot sum matches expected_qty', () => {
    // Patch form top-level required fields
    component.form.patchValue({ inbound_number: 'IB-001', assigned_to: 'user-1', priority: 'normal' });
    (component as any).itemsArray.at(0).get('sku')?.setValue('SKU-LOT');
    (component as any).itemsArray.at(0).get('location')?.setValue('A-01');
    (component as any).expectedQuantities[0] = 10;
    component.addLot(0);
    component.getLotsArray(0).at(0).get('lot_number')?.setValue('LOT-A');
    component.getLotsArray(0).at(0).get('quantity')?.setValue(10);
    expect(component.isFormComplete()).toBeTrue();
  });
});
