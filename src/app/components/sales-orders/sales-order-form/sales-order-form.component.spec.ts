import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { SalesOrderFormComponent } from './sales-order-form.component';
import { SalesOrdersService } from '@app/services/sales-orders.service';
import { ClientsService } from '@app/services/clients.service';
import { ArticleService } from '@app/services/article.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';
import { LoadingService } from '@app/services/extras/loading.service';

const okResponse = (data: any) => Promise.resolve({ result: { success: true }, data });
const errResponse = (msg: string) =>
  Promise.resolve({ result: { success: false, message: msg }, data: null });

const mockSalesOrdersService = {
  create: jasmine.createSpy('create').and.returnValue(okResponse({})),
  update: jasmine.createSpy('update').and.returnValue(okResponse({})),
};

const mockClientsService = {
  list: () =>
    okResponse([
      { id: 'c-1', name: 'Cliente A', type: 'customer', is_active: true, code: 'CA001', created_at: '', updated_at: '', tenant_id: '' },
      { id: 'c-2', name: 'Cliente B', type: 'both',     is_active: true, code: 'CB001', created_at: '', updated_at: '', tenant_id: '' },
    ]),
};

const mockArticleService = {
  getAll: () =>
    okResponse([
      { id: 1, sku: 'SKU-001', name: 'Artículo Uno', is_active: true, presentation: 'unit', track_by_lot: false, track_by_serial: false, track_expiration: false, created_at: '', updated_at: '' },
      { id: 2, sku: 'SKU-002', name: 'Artículo Dos', is_active: true, presentation: 'unit', track_by_lot: false, track_by_serial: false, track_expiration: false, created_at: '', updated_at: '' },
    ]),
};

const mockAlertService = {
  success: jasmine.createSpy('success'),
  error: jasmine.createSpy('error'),
};

const mockLoadingService = {
  show: jasmine.createSpy('show'),
  hide: jasmine.createSpy('hide'),
};

const mockLanguageService = {
  t: (key: string) => key,
};

describe('SalesOrderFormComponent', () => {
  let component: SalesOrderFormComponent;

  beforeEach(async () => {
    mockSalesOrdersService.create.calls.reset();
    mockSalesOrdersService.create.and.returnValue(okResponse({}));
    mockSalesOrdersService.update.calls.reset();
    mockSalesOrdersService.update.and.returnValue(okResponse({}));
    mockAlertService.success.calls.reset();
    mockAlertService.error.calls.reset();

    await TestBed.configureTestingModule({
      imports: [
        SalesOrderFormComponent,
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        RouterModule.forRoot([]),
        HttpClientTestingModule,
      ],
      providers: [
        provideNoopAnimations(),
        { provide: SalesOrdersService, useValue: mockSalesOrdersService },
        { provide: ClientsService, useValue: mockClientsService },
        { provide: ArticleService, useValue: mockArticleService },
        { provide: AlertService, useValue: mockAlertService },
        { provide: LoadingService, useValue: mockLoadingService },
        { provide: LanguageService, useValue: mockLanguageService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SalesOrderFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // Wait for async ngOnInit (loadData)
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with one item row in create mode', () => {
    expect(component.itemsArray.length).toBe(1);
  });

  it('form should be invalid when customer_id is empty', () => {
    component.form.patchValue({ customer_id: '' });
    expect(component.form.get('customer_id')?.valid).toBeFalse();
  });

  it('form should be valid when customer_id is set and items present', () => {
    component.form.patchValue({ customer_id: 'c-1' });
    component.itemsArray.at(0).patchValue({ article_sku: 'SKU-001', expected_qty: 5 });
    expect(component.form.valid).toBeTrue();
  });

  it('items FormArray should fail atLeastOneItem validator when empty', () => {
    while (component.itemsArray.length > 0) {
      component.itemsArray.removeAt(0);
    }
    expect(component.itemsArray.errors?.['atLeastOne']).toBeTrue();
    expect(component.form.valid).toBeFalse();
  });

  it('should add item when addItem is called', () => {
    const before = component.itemsArray.length;
    component.addItem();
    expect(component.itemsArray.length).toBe(before + 1);
  });

  it('should remove item when removeItem is called', () => {
    component.addItem(); // ensure 2 items
    const before = component.itemsArray.length;
    component.removeItem(before - 1);
    expect(component.itemsArray.length).toBe(before - 1);
  });

  it('item should be invalid when expected_qty <= 0', () => {
    component.itemsArray.at(0).patchValue({ article_sku: 'SKU-001', expected_qty: 0 });
    component.itemsArray.at(0).markAllAsTouched();
    expect(component.itemsArray.at(0).get('expected_qty')?.valid).toBeFalse();
  });

  it('item should be valid with expected_qty >= 0.001', () => {
    component.itemsArray.at(0).patchValue({ article_sku: 'SKU-001', expected_qty: 0.001 });
    expect(component.itemsArray.at(0).get('expected_qty')?.valid).toBeTrue();
  });

  it('should load customers including type="both"', async () => {
    // mockClientsService returns both type='customer' and type='both'
    expect(component.customers.length).toBe(2);
    expect(component.customers.some((c) => c.type === 'both')).toBeTrue();
  });

  it('should call create service on submit in create mode', async () => {
    component.form.patchValue({ customer_id: 'c-1', expected_date: '', notes: '' });
    component.itemsArray.at(0).patchValue({ article_sku: 'SKU-001', expected_qty: 3 });
    await component.onSubmit();
    expect(mockSalesOrdersService.create).toHaveBeenCalled();
  });

  it('should not call create when form is invalid', async () => {
    component.form.patchValue({ customer_id: '' });
    await component.onSubmit();
    expect(mockSalesOrdersService.create).not.toHaveBeenCalled();
  });

  it('should emit success after successful create', async () => {
    const successSpy = jasmine.createSpy('success');
    component.success.subscribe(successSpy);
    component.form.patchValue({ customer_id: 'c-1' });
    component.itemsArray.at(0).patchValue({ article_sku: 'SKU-001', expected_qty: 2 });
    await component.onSubmit();
    expect(successSpy).toHaveBeenCalled();
  });

  it('should emit cancel when close() is called', () => {
    const cancelSpy = jasmine.createSpy('cancel');
    component.cancel.subscribe(cancelSpy);
    component.close();
    expect(cancelSpy).toHaveBeenCalled();
  });

  it('should call update service when editing an existing order', async () => {
    component.order = {
      id: 'so-1', so_number: 'SO-001', customer_id: 'c-1', status: 'draft',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      items: [],
    };
    component.isEditing = true;
    component.form.patchValue({ customer_id: 'c-1', expected_date: '', notes: '' });
    component.itemsArray.at(0).patchValue({ article_sku: 'SKU-001', expected_qty: 1 });
    await component.onSubmit();
    expect(mockSalesOrdersService.update).toHaveBeenCalledWith('so-1', jasmine.any(Object));
  });

  it('should show error when create service fails', async () => {
    mockSalesOrdersService.create.and.returnValue(errResponse('Server error'));
    component.form.patchValue({ customer_id: 'c-1' });
    component.itemsArray.at(0).patchValue({ article_sku: 'SKU-001', expected_qty: 1 });
    await component.onSubmit();
    expect(mockAlertService.error).toHaveBeenCalled();
  });
});
