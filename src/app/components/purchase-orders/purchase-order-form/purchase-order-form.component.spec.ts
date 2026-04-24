import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { PurchaseOrderFormComponent } from './purchase-order-form.component';
import { PurchaseOrdersService } from '@app/services/purchase-orders.service';
import { ClientsService } from '@app/services/clients.service';
import { ArticleService } from '@app/services/article.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';
import { AuthorizationService } from '@app/services/extras/authorization.service';

const okResponse = (data: any) => Promise.resolve({ result: { success: true }, data });

const mockPurchaseOrdersService = {
  create: jasmine.createSpy('create').and.returnValue(okResponse({})),
  update: jasmine.createSpy('update').and.returnValue(okResponse({})),
  getById: () => okResponse({
    id: 'po-1', po_number: 'PO-001', supplier_id: 'sup-1', status: 'draft',
    items: [{ article_sku: 'SKU-1', expected_qty: 5, received_qty: 0, rejected_qty: 0, discrepancy: 0 }],
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }),
};

const mockClientsService = {
  list: () => okResponse([
    { id: 'sup-1', name: 'Proveedor A', type: 'supplier', is_active: true, code: 'P001', created_at: '', updated_at: '', tenant_id: '' },
  ]),
};

const mockArticleService = {
  getAll: () => okResponse([
    { id: 1, sku: 'SKU-1', name: 'Artículo 1', is_active: true, presentation: 'unit', track_by_lot: false, track_by_serial: false, track_expiration: false, created_at: '', updated_at: '' },
  ]),
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

describe('PurchaseOrderFormComponent', () => {
  let component: PurchaseOrderFormComponent;

  beforeEach(async () => {
    mockPurchaseOrdersService.create.calls.reset();
    mockPurchaseOrdersService.update.calls.reset();

    await TestBed.configureTestingModule({
      imports: [
        PurchaseOrderFormComponent,
        CommonModule,
        ReactiveFormsModule,
        RouterModule.forRoot([]),
        HttpClientTestingModule,
      ],
      providers: [
        provideNoopAnimations(),
        { provide: PurchaseOrdersService, useValue: mockPurchaseOrdersService },
        { provide: ClientsService, useValue: mockClientsService },
        { provide: ArticleService, useValue: mockArticleService },
        { provide: AlertService, useValue: mockAlertService },
        { provide: AuthorizationService, useValue: mockAuthorizationService },
        { provide: LanguageService, useValue: mockLanguageService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PurchaseOrderFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with one item row', () => {
    expect(component.items.length).toBe(1);
  });

  it('should add item when addItem is called', () => {
    const before = component.items.length;
    component.addItem();
    expect(component.items.length).toBe(before + 1);
  });

  it('should remove item when removeItem is called (only if >1)', () => {
    component.addItem(); // now 2
    expect(component.items.length).toBe(2);
    component.removeItem(1);
    expect(component.items.length).toBe(1);
  });

  it('should NOT remove last item', () => {
    expect(component.items.length).toBe(1);
    component.removeItem(0);
    expect(component.items.length).toBe(1); // stays 1
  });

  it('form should be invalid without supplier_id', () => {
    component.form.patchValue({ supplier_id: '' });
    expect(component.form.get('supplier_id')?.valid).toBeFalse();
  });

  it('form should be invalid without items', () => {
    while (component.items.length > 0) {
      component.items.removeAt(0);
    }
    expect(component.items.valid).toBeFalse();
  });

  it('items should be invalid with expected_qty = 0', () => {
    component.items.at(0).patchValue({ article_sku: 'SKU-1', expected_qty: 0 });
    component.items.at(0).markAllAsTouched();
    expect(component.items.at(0).get('expected_qty')?.valid).toBeFalse();
  });

  it('items should be valid with expected_qty >= 1', () => {
    component.items.at(0).patchValue({ article_sku: 'SKU-1', expected_qty: 1 });
    expect(component.items.at(0).get('expected_qty')?.valid).toBeTrue();
  });

  it('isDraftMode should be true when no PO is loaded', () => {
    expect(component.isDraftMode).toBeTrue();
  });

  it('isEditMode should be true when mode=edit', () => {
    component.mode = 'edit';
    expect(component.isEditMode).toBeTrue();
  });

  it('isEditMode should be false when mode=create', () => {
    component.mode = 'create';
    expect(component.isEditMode).toBeFalse();
  });

  it('should call create service on submit in create mode', async () => {
    component.mode = 'create';
    component.form.patchValue({ supplier_id: 'sup-1', expected_date: '', notes: '' });
    component.items.at(0).patchValue({ article_sku: 'SKU-1', expected_qty: 5 });
    await component.onSubmit();
    expect(mockPurchaseOrdersService.create).toHaveBeenCalled();
  });
});
