import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { PurchaseOrderDetailComponent } from './purchase-order-detail.component';
import { PurchaseOrdersService } from '@app/services/purchase-orders.service';
import { AlertService } from '@app/services/extras/alert.service';
import { AuthorizationService } from '@app/services/extras/authorization.service';
import { LanguageService } from '@app/services/extras/language.service';
import { PurchaseOrder } from '@app/models/purchase-order.model';

const okResponse = (data: any) => Promise.resolve({ result: { success: true }, data });

const mockPo: PurchaseOrder = {
  id: 'po-1',
  po_number: 'PO-001',
  supplier_id: 'sup-1',
  status: 'draft',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  items: [
    { id: 'item-1', purchase_order_id: 'po-1', article_sku: 'SKU-A', expected_qty: 10, received_qty: 8, rejected_qty: 0, discrepancy: 2 },
    { id: 'item-2', purchase_order_id: 'po-1', article_sku: 'SKU-B', expected_qty: 5, received_qty: 5, rejected_qty: 0, discrepancy: 0 },
  ],
};

const mockPurchaseOrdersService = {
  getById: jasmine.createSpy('getById').and.returnValue(okResponse(mockPo)),
  submit: jasmine.createSpy('submit').and.returnValue(okResponse({})),
  cancel: jasmine.createSpy('cancel').and.returnValue(okResponse({})),
  softDelete: jasmine.createSpy('softDelete').and.returnValue(okResponse(null)),
};

const mockAlertService = {
  success: jasmine.createSpy('success'),
  error: jasmine.createSpy('error'),
};

const mockAuthorizationService = {
  hasPermission: () => true,
  isAdmin: () => true,
  isAuthenticated: () => true,
  getCurrentUser: () => ({ name: 'Test', last_name: 'User', role: 'Admin', email: 'test@test.com' }),
};

const mockLanguageService = {
  t: (key: string) => key,
};

describe('PurchaseOrderDetailComponent', () => {
  let component: PurchaseOrderDetailComponent;

  beforeEach(async () => {
    mockPurchaseOrdersService.getById.calls.reset();
    mockPurchaseOrdersService.getById.and.returnValue(okResponse(mockPo));
    mockPurchaseOrdersService.submit.calls.reset();
    mockPurchaseOrdersService.cancel.calls.reset();
    mockPurchaseOrdersService.softDelete.calls.reset();

    await TestBed.configureTestingModule({
      imports: [
        PurchaseOrderDetailComponent,
        CommonModule,
        RouterModule.forRoot([]),
        HttpClientTestingModule,
      ],
      providers: [
        provideNoopAnimations(),
        { provide: PurchaseOrdersService, useValue: mockPurchaseOrdersService },
        { provide: AlertService, useValue: mockAlertService },
        { provide: AuthorizationService, useValue: mockAuthorizationService },
        { provide: LanguageService, useValue: mockLanguageService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: (_key: string) => 'po-1' } } },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PurchaseOrderDetailComponent);
    component = fixture.componentInstance;
    // Set PO directly to avoid async load in beforeEach
    component.po = { ...mockPo };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('isDraft should be true when po.status=draft', () => {
    expect(component.isDraft).toBeTrue();
  });

  it('isDraft should be false when po.status=submitted', () => {
    component.po = { ...mockPo, status: 'submitted' };
    expect(component.isDraft).toBeFalse();
  });

  it('canEdit should be true for draft with permission', () => {
    expect(component.canEdit).toBeTrue();
  });

  it('canSubmit should be true for draft with permission', () => {
    expect(component.canSubmit).toBeTrue();
  });

  it('canCancel should be true for draft', () => {
    expect(component.canCancel).toBeTrue();
  });

  it('canCancel should be false for completed', () => {
    component.po = { ...mockPo, status: 'completed' };
    expect(component.canCancel).toBeFalse();
  });

  it('canDelete should be true for draft', () => {
    expect(component.canDelete).toBeTrue();
  });

  it('hasDiscrepancies should be true when any item has discrepancy != 0', () => {
    expect(component.hasDiscrepancies).toBeTrue();
  });

  it('discrepantItems should only include items with discrepancy != 0', () => {
    expect(component.discrepantItems.length).toBe(1);
    expect(component.discrepantItems[0].article_sku).toBe('SKU-A');
  });

  it('discrepancyClass should return red for positive discrepancy', () => {
    const item: any = { discrepancy: 2 };
    expect(component.discrepancyClass(item)).toContain('red');
  });

  it('discrepancyClass should return amber for negative discrepancy', () => {
    const item: any = { discrepancy: -1 };
    expect(component.discrepancyClass(item)).toContain('amber');
  });

  it('discrepancyClass should return text-foreground for zero', () => {
    const item: any = { discrepancy: 0 };
    expect(component.discrepancyClass(item)).toBe('text-foreground');
  });

  it('discrepancyLabel should return +N for positive', () => {
    const item: any = { discrepancy: 3 };
    expect(component.discrepancyLabel(item)).toBe('+3');
  });

  it('discrepancyLabel should return — for zero', () => {
    const item: any = { discrepancy: 0 };
    expect(component.discrepancyLabel(item)).toBe('—');
  });

  it('statusBadgeClass should return blue for submitted', () => {
    expect(component.statusBadgeClass('submitted')).toContain('blue');
  });

  it('statusBadgeClass should return green for completed', () => {
    expect(component.statusBadgeClass('completed')).toContain('green');
  });
});
