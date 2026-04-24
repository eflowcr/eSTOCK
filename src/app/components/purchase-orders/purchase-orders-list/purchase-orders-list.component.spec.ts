import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { PurchaseOrdersListComponent } from './purchase-orders-list.component';
import { PurchaseOrdersService } from '@app/services/purchase-orders.service';
import { ClientsService } from '@app/services/clients.service';
import { AlertService } from '@app/services/extras/alert.service';
import { AuthorizationService } from '@app/services/extras/authorization.service';
import { LanguageService } from '@app/services/extras/language.service';

const okResponse = (data: any) => Promise.resolve({ result: { success: true }, data });

const mockPurchaseOrdersService = {
  list: () => okResponse([]),
  softDelete: () => okResponse(null),
  submit: () => okResponse({ purchase_order: {}, receiving_task_id: 'rt-1' }),
  cancel: () => okResponse({}),
};

const mockClientsService = {
  list: () => okResponse([]),
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

describe('PurchaseOrdersListComponent', () => {
  let component: PurchaseOrdersListComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        PurchaseOrdersListComponent,
        CommonModule,
        FormsModule,
        RouterModule.forRoot([]),
        HttpClientTestingModule,
      ],
      providers: [
        provideNoopAnimations(),
        { provide: PurchaseOrdersService, useValue: mockPurchaseOrdersService },
        { provide: ClientsService, useValue: mockClientsService },
        { provide: AlertService, useValue: mockAlertService },
        { provide: AuthorizationService, useValue: mockAuthorizationService },
        { provide: LanguageService, useValue: mockLanguageService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PurchaseOrdersListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with isLoading = false', () => {
    expect(component.isLoading()).toBe(false);
  });

  it('should initialize with empty purchaseOrders', () => {
    expect(component.purchaseOrders).toEqual([]);
  });

  it('should start on page 1', () => {
    expect(component.page).toBe(1);
  });

  it('should reset page on filter change', () => {
    component.page = 3;
    spyOn(component, 'loadPurchaseOrders').and.returnValue(Promise.resolve());
    component.onFilterChange();
    expect(component.page).toBe(1);
  });

  it('canEdit should be true for draft status', () => {
    const po: any = { id: '1', status: 'draft', po_number: 'PO-001' };
    expect(component.canEdit(po)).toBeTrue();
  });

  it('canEdit should be false for submitted status', () => {
    const po: any = { id: '1', status: 'submitted', po_number: 'PO-001' };
    expect(component.canEdit(po)).toBeFalse();
  });

  it('canSubmit should be true for draft', () => {
    const po: any = { id: '1', status: 'draft', po_number: 'PO-001' };
    expect(component.canSubmit(po)).toBeTrue();
  });

  it('canCancel should be false for completed', () => {
    const po: any = { id: '1', status: 'completed', po_number: 'PO-001' };
    expect(component.canCancel(po)).toBeFalse();
  });

  it('canCancel should be false for cancelled', () => {
    const po: any = { id: '1', status: 'cancelled', po_number: 'PO-001' };
    expect(component.canCancel(po)).toBeFalse();
  });

  it('canCancel should be true for submitted', () => {
    const po: any = { id: '1', status: 'submitted', po_number: 'PO-001' };
    expect(component.canCancel(po)).toBeTrue();
  });

  it('canDelete should be true only for draft', () => {
    const draftPo: any = { id: '1', status: 'draft' };
    const submittedPo: any = { id: '2', status: 'submitted' };
    expect(component.canDelete(draftPo)).toBeTrue();
    expect(component.canDelete(submittedPo)).toBeFalse();
  });

  it('statusBadgeClass should return green for completed', () => {
    expect(component.statusBadgeClass('completed')).toContain('green');
  });

  it('statusBadgeClass should return red for cancelled', () => {
    expect(component.statusBadgeClass('cancelled')).toContain('red');
  });

  it('statusBadgeClass should return amber for partial', () => {
    expect(component.statusBadgeClass('partial')).toContain('amber');
  });

  it('pageEnd should be min(page*pageSize, totalCount)', () => {
    component.page = 1;
    component.pageSize = 20;
    component.totalCount = 15;
    expect(component.pageEnd).toBe(15);

    component.totalCount = 50;
    expect(component.pageEnd).toBe(20);
  });

  it('openCreateForm should set mode to create and open form', () => {
    component.openCreateForm();
    expect(component.formMode).toBe('create');
    expect(component.isFormOpen).toBeTrue();
    expect(component.selectedPoId).toBeUndefined();
  });

  it('openEditForm should set mode to edit and open form with id', () => {
    const po: any = { id: 'po-123', status: 'draft', po_number: 'PO-001' };
    component.openEditForm(po);
    expect(component.formMode).toBe('edit');
    expect(component.isFormOpen).toBeTrue();
    expect(component.selectedPoId).toBe('po-123');
  });
});
