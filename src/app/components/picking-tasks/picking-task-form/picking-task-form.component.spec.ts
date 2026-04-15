import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormArray, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';

import { PickingTaskFormComponent } from './picking-task-form.component';
import { PickingTaskService } from '@app/services/picking-task.service';
import { InventoryService } from '@app/services/inventory.service';
import { LocationService } from '@app/services/location.service';
import { UserService } from '@app/services/user.service';
import { ArticleService } from '@app/services/article.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LoadingService } from '@app/services/extras/loading.service';
import { LanguageService } from '@app/services/extras/language.service';
import { DrawerComponent } from '@app/shared/components/drawer';
import { ZardButtonComponent } from '@app/shared/components/button/button.component';
import { ZardSelectComponent } from '@app/shared/components/select/select.component';
import { ZardSelectItemComponent } from '@app/shared/components/select/select-item.component';

// ── Minimal stubs ────────────────────────────────────────────

const successResp = (data: any) => ({ result: { success: true, message: '' }, data });
const failResp = (msg: string) => ({ result: { success: false, message: msg }, data: null });

function mockLanguageService() {
  return { t: (key: string) => key };
}

function mockAlertService() {
  return { success: jasmine.createSpy(), error: jasmine.createSpy(), warning: jasmine.createSpy() };
}

function mockLoadingService() {
  return { show: jasmine.createSpy(), hide: jasmine.createSpy() };
}

function mockLocationService() {
  return { getAll: () => Promise.resolve(successResp([])) };
}

function mockUserService() {
  return { getAll: () => Promise.resolve(successResp([])) };
}

function mockArticleService() {
  return { getAll: () => Promise.resolve(successResp([])) };
}

const defaultPickSuggestionsResp = successResp({
  allocations: [
    { location: 'LOC-A', quantity: 60, lot_number: 'L001', expiration_date: '2027-01-01' },
    { location: 'LOC-B', quantity: 40, lot_number: 'L002', expiration_date: '2027-06-01' },
  ],
  total_found: 100,
  requested: 100,
  sufficient: true,
});

const insufficientPickSuggestionsResp = successResp({
  allocations: [
    { location: 'LOC-A', quantity: 30, lot_number: 'L001' },
  ],
  total_found: 30,
  requested: 100,
  sufficient: false,
});

// ── Test suite ───────────────────────────────────────────────

describe('PickingTaskFormComponent', () => {
  let component: PickingTaskFormComponent;
  let fixture: ComponentFixture<PickingTaskFormComponent>;
  let inventoryServiceSpy: jasmine.SpyObj<InventoryService>;
  let pickingTaskServiceSpy: jasmine.SpyObj<PickingTaskService>;
  let alertServiceSpy: ReturnType<typeof mockAlertService>;

  beforeEach(async () => {
    inventoryServiceSpy = jasmine.createSpyObj('InventoryService', [
      'getPickSuggestions',
      'getBySkuAndLocation',
    ]);
    inventoryServiceSpy.getPickSuggestions.and.returnValue(Promise.resolve(defaultPickSuggestionsResp as any));
    inventoryServiceSpy.getBySkuAndLocation.and.returnValue(Promise.resolve(null));

    pickingTaskServiceSpy = jasmine.createSpyObj('PickingTaskService', [
      'create', 'update', 'start',
    ]);
    pickingTaskServiceSpy.create.and.returnValue(Promise.resolve(successResp({}) as any));
    pickingTaskServiceSpy.update.and.returnValue(Promise.resolve(successResp({}) as any));
    pickingTaskServiceSpy.start.and.returnValue(Promise.resolve(successResp({}) as any));

    alertServiceSpy = mockAlertService();

    await TestBed.configureTestingModule({
      imports: [
        PickingTaskFormComponent,
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
      ],
      providers: [
        { provide: PickingTaskService, useValue: pickingTaskServiceSpy },
        { provide: InventoryService, useValue: inventoryServiceSpy },
        { provide: LocationService, useValue: mockLocationService() },
        { provide: UserService, useValue: mockUserService() },
        { provide: ArticleService, useValue: mockArticleService() },
        { provide: AlertService, useValue: alertServiceSpy },
        { provide: LoadingService, useValue: mockLoadingService() },
        { provide: LanguageService, useValue: mockLanguageService() },
        ChangeDetectorRef,
      ],
    })
    .overrideComponent(PickingTaskFormComponent, {
      // Stub heavy UI components to simplify rendering
      remove: { imports: [DrawerComponent, ZardButtonComponent, ZardSelectComponent, ZardSelectItemComponent] },
      add: { imports: [] },
    })
    .compileComponents();

    fixture = TestBed.createComponent(PickingTaskFormComponent);
    component = fixture.componentInstance;
    // Skip ngOnInit's async loadData to keep tests fast
    spyOn(component, 'loadData').and.returnValue(Promise.resolve());
    fixture.detectChanges();
    // Manually trigger ngOnInit logic after stubbing loadData
    await component.ngOnInit();
  });

  // ── Helpers ──────────────────────────────────────────────

  function getItemGroup(i = 0): FormGroup {
    return component.getItemsArray().at(i) as FormGroup;
  }

  function getAllocsArray(i = 0): FormArray {
    return component.getAllocationsArray(i);
  }

  // ── TestAllocationFormArray_AddRemove ──────────────────

  it('TestAllocationFormArray_AddRemove — add and remove allocations correctly', () => {
    // Ensure at least one item exists
    expect(component.getItemsArray().length).toBeGreaterThanOrEqual(1);

    // Add two allocations
    component.addAllocation(0);
    component.addAllocation(0);
    expect(getAllocsArray(0).length).toBe(2);

    // Remove the first one
    component.removeAllocation(0, 0);
    expect(getAllocsArray(0).length).toBe(1);
  });

  // ── TestAllocationSumValidation_Match ─────────────────

  it('TestAllocationSumValidation_Match — canSubmit is true when sum matches required_qty', () => {
    // Set sku and required_qty on the item
    const itemGroup = getItemGroup(0);
    itemGroup.get('sku')!.setValue('SKU-001');
    itemGroup.get('required_qty')!.setValue(100);

    // Add two allocations that sum to 100
    component.addAllocation(0);
    component.addAllocation(0);
    const allocs = getAllocsArray(0);
    (allocs.at(0) as FormGroup).get('location')!.setValue('LOC-A');
    (allocs.at(0) as FormGroup).get('quantity')!.setValue(60);
    (allocs.at(1) as FormGroup).get('location')!.setValue('LOC-B');
    (allocs.at(1) as FormGroup).get('quantity')!.setValue(40);

    expect(component.validateAllocationSum(0)).toBeNull();
    expect(component.canSubmit()).toBeTrue();
  });

  // ── TestAllocationSumValidation_Mismatch ──────────────

  it('TestAllocationSumValidation_Mismatch — canSubmit is false when sum differs from required_qty', () => {
    const itemGroup = getItemGroup(0);
    itemGroup.get('sku')!.setValue('SKU-001');
    itemGroup.get('required_qty')!.setValue(100);

    component.addAllocation(0);
    const allocs = getAllocsArray(0);
    (allocs.at(0) as FormGroup).get('location')!.setValue('LOC-A');
    (allocs.at(0) as FormGroup).get('quantity')!.setValue(50); // only 50, not 100

    expect(component.validateAllocationSum(0)).not.toBeNull();
    expect(component.canSubmit()).toBeFalse();
  });

  // ── TestPrefillAllocations_FromFEFO ───────────────────

  it('TestPrefillAllocations_FromFEFO — pre-fills allocations from pick-suggestions (2 locations)', fakeAsync(async () => {
    const itemGroup = getItemGroup(0);
    itemGroup.get('sku')!.setValue('SKU-001');
    itemGroup.get('required_qty')!.setValue(100);

    inventoryServiceSpy.getPickSuggestions.and.returnValue(Promise.resolve(defaultPickSuggestionsResp as any));
    await component.prefillAllocationsForItem(0, 'SKU-001', 100);
    tick();

    const allocs = getAllocsArray(0);
    expect(allocs.length).toBe(2);
    expect((allocs.at(0) as FormGroup).get('location')!.value).toBe('LOC-A');
    expect((allocs.at(0) as FormGroup).get('quantity')!.value).toBe(60);
    expect((allocs.at(1) as FormGroup).get('location')!.value).toBe('LOC-B');
    expect((allocs.at(1) as FormGroup).get('quantity')!.value).toBe(40);
    expect(component.stockWarnings[0]).toBeUndefined();
  }));

  // ── TestPrefillAllocations_Insufficient ───────────────

  it('TestPrefillAllocations_Insufficient — shows warning when stock is insufficient', fakeAsync(async () => {
    inventoryServiceSpy.getPickSuggestions.and.returnValue(Promise.resolve(insufficientPickSuggestionsResp as any));
    await component.prefillAllocationsForItem(0, 'SKU-001', 100);
    tick();

    expect(component.stockWarnings[0]).toBeDefined();
    expect(component.stockWarnings[0]).toContain('30 uds');
  }));

  // ── TestAvailableQty_Sufficient_Green ─────────────────

  it('TestAvailableQty_Sufficient_Green — isAllocInsufficient is false when qty <= available', fakeAsync(async () => {
    // Set up allocation with quantity 50
    component.addAllocation(0);
    const allocs = getAllocsArray(0);
    (allocs.at(0) as FormGroup).get('location')!.setValue('LOC-A');
    (allocs.at(0) as FormGroup).get('quantity')!.setValue(50);

    // Mock inventory returns available_qty = 100
    inventoryServiceSpy.getBySkuAndLocation.and.returnValue(
      Promise.resolve(successResp({ quantity: 120, reserved_qty: 20, available_qty: 100 }) as any)
    );
    await component.loadAvailableQtyForAlloc(0, 0, 'SKU-001', 'LOC-A');
    tick();

    expect(component.getAvailableQty(0, 0)).toBe(100);
    expect(component.isAllocInsufficient(0, 0)).toBeFalse();
  }));

  // ── TestAvailableQty_Insufficient_Red ─────────────────

  it('TestAvailableQty_Insufficient_Red — isAllocInsufficient is true when qty > available', fakeAsync(async () => {
    component.addAllocation(0);
    const allocs = getAllocsArray(0);
    (allocs.at(0) as FormGroup).get('location')!.setValue('LOC-A');
    (allocs.at(0) as FormGroup).get('quantity')!.setValue(80);

    inventoryServiceSpy.getBySkuAndLocation.and.returnValue(
      Promise.resolve(successResp({ quantity: 50, reserved_qty: 0, available_qty: 50 }) as any)
    );
    await component.loadAvailableQtyForAlloc(0, 0, 'SKU-001', 'LOC-A');
    tick();

    expect(component.getAvailableQty(0, 0)).toBe(50);
    expect(component.isAllocInsufficient(0, 0)).toBeTrue();
  }));

  // ── TestStartPicking_CallsService ─────────────────────

  it('TestStartPicking_CallsService — calls pickingTaskService.start with the task id', fakeAsync(async () => {
    component.task = {
      id: 'task-123',
      task_id: 'PT-001',
      created_by: 'u1',
      assigned_to: 'u2',
      status: 'open',
      priority: 'normal',
      items: [],
      created_at: '',
      updated_at: '',
    };

    await component.startPicking();
    tick();

    expect(pickingTaskServiceSpy.start).toHaveBeenCalledWith('task-123');
  }));

  // ── TestStartPicking_ErrorShowsAlert ──────────────────

  it('TestStartPicking_ErrorShowsAlert — shows alert when start fails with backend error', fakeAsync(async () => {
    component.task = {
      id: 'task-456',
      task_id: 'PT-002',
      created_by: 'u1',
      assigned_to: 'u2',
      status: 'open',
      priority: 'normal',
      items: [],
      created_at: '',
      updated_at: '',
    };

    pickingTaskServiceSpy.start.and.returnValue(
      Promise.resolve(failResp('Stock insuficiente para SKU-001 en LOC-A') as any)
    );

    await component.startPicking();
    tick();

    expect(alertServiceSpy.error).toHaveBeenCalled();
    const errorMsg = (alertServiceSpy.error as jasmine.Spy).calls.mostRecent().args[0] as string;
    expect(errorMsg.toLowerCase()).toContain('insuficiente');
  }));
});
