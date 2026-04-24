import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterModule } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { SalesOrdersListComponent } from './sales-orders-list.component';
import { SalesOrdersService } from '@app/services/sales-orders.service';
import { ClientsService } from '@app/services/clients.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';
import { LoadingService } from '@app/services/extras/loading.service';
import { SalesOrder } from '@app/models/sales-order.model';
import { Client } from '@app/models/client.model';
import { mockResponse } from '../../../../__tests__/mocks/data';

const MOCK_CUSTOMER: Client = {
  id: 'cust-001',
  tenant_id: 't1',
  type: 'customer',
  code: 'C001',
  name: 'Cliente Alpha',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const MOCK_ORDERS: SalesOrder[] = [
  {
    id: 'so-1',
    so_number: 'SO-2026-001',
    customer_id: 'cust-001',
    status: 'draft',
    created_at: '2026-04-20T10:00:00Z',
    updated_at: '2026-04-20T10:00:00Z',
    customer: { id: 'cust-001', code: 'C001', name: 'Cliente Alpha' },
  },
  {
    id: 'so-2',
    so_number: 'SO-2026-002',
    customer_id: 'cust-001',
    status: 'submitted',
    created_at: '2026-04-21T10:00:00Z',
    updated_at: '2026-04-21T10:00:00Z',
  },
  {
    id: 'so-3',
    so_number: 'SO-2026-003',
    customer_id: 'cust-001',
    status: 'completed',
    created_at: '2026-04-22T10:00:00Z',
    updated_at: '2026-04-22T10:00:00Z',
  },
];

describe('SalesOrdersListComponent', () => {
  let component: SalesOrdersListComponent;
  let fixture: ComponentFixture<SalesOrdersListComponent>;
  let soServiceSpy: jasmine.SpyObj<SalesOrdersService>;
  let alertSpy: jasmine.SpyObj<AlertService>;
  let loadingSpy: jasmine.SpyObj<LoadingService>;

  beforeEach(async () => {
    soServiceSpy = jasmine.createSpyObj('SalesOrdersService', ['submit', 'cancel', 'softDelete']);
    alertSpy = jasmine.createSpyObj('AlertService', ['success', 'error']);
    loadingSpy = jasmine.createSpyObj('LoadingService', ['show', 'hide']);

    const langSpy = jasmine.createSpyObj('LanguageService', ['t']);
    langSpy.t.and.callFake((key: string) => key);

    await TestBed.configureTestingModule({
      imports: [SalesOrdersListComponent, RouterModule.forRoot([]), HttpClientTestingModule],
      providers: [
        provideNoopAnimations(),
        { provide: SalesOrdersService, useValue: soServiceSpy },
        { provide: ClientsService, useValue: {} },
        { provide: AlertService, useValue: alertSpy },
        { provide: LanguageService, useValue: langSpy },
        { provide: LoadingService, useValue: loadingSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SalesOrdersListComponent);
    component = fixture.componentInstance;
    component.orders = MOCK_ORDERS;
    component.customers = [MOCK_CUSTOMER];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows all orders passed as @Input', () => {
    // Server-side: no client-side filtering, orders come as-is from parent
    expect(component.orders.length).toBe(3);
  });

  it('emits filterChange when localStatus changes', () => {
    spyOn(component.filterChange, 'emit');
    component.localStatus = 'draft';
    component.emitFilterChange();
    expect(component.filterChange.emit).toHaveBeenCalledWith(
      jasmine.objectContaining({ status: 'draft' }),
    );
  });

  it('emits filterChange when localCustomer changes', () => {
    spyOn(component.filterChange, 'emit');
    component.localCustomer = 'cust-001';
    component.emitFilterChange();
    expect(component.filterChange.emit).toHaveBeenCalledWith(
      jasmine.objectContaining({ customer_id: 'cust-001' }),
    );
  });

  it('emits filterChange when localSearch changes', () => {
    spyOn(component.filterChange, 'emit');
    component.localSearch = 'SO-001';
    component.emitFilterChange();
    expect(component.filterChange.emit).toHaveBeenCalledWith(
      jasmine.objectContaining({ search: 'SO-001' }),
    );
  });

  it('emits pageChange on onPrevPage() when currentPage > 1', () => {
    spyOn(component.pageChange, 'emit');
    component.currentPage = 3;
    component.totalCount = 100;
    component.pageSize = 20;
    component.onPrevPage();
    expect(component.pageChange.emit).toHaveBeenCalledWith(2);
  });

  it('does not emit pageChange on onPrevPage() when at page 1', () => {
    spyOn(component.pageChange, 'emit');
    component.currentPage = 1;
    component.onPrevPage();
    expect(component.pageChange.emit).not.toHaveBeenCalled();
  });

  it('emits pageChange on onNextPage() when more pages exist', () => {
    spyOn(component.pageChange, 'emit');
    component.currentPage = 1;
    component.totalCount = 100;
    component.pageSize = 20;
    component.onNextPage();
    expect(component.pageChange.emit).toHaveBeenCalledWith(2);
  });

  it('emits newOrder when new order button clicked', () => {
    spyOn(component.newOrder, 'emit');
    component.onNewOrder();
    expect(component.newOrder.emit).toHaveBeenCalled();
  });

  it('emits edit when edit is called', () => {
    spyOn(component.edit, 'emit');
    component.onEdit(MOCK_ORDERS[0]);
    expect(component.edit.emit).toHaveBeenCalledWith(MOCK_ORDERS[0]);
  });

  it('calls submit service and emits refresh on success', async () => {
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(component.refresh, 'emit');
    soServiceSpy.submit.and.returnValue(
      Promise.resolve(mockResponse({ sales_order: MOCK_ORDERS[0], picking_task_id: 'pt-1' }))
    );
    await component.onSubmit(MOCK_ORDERS[0]);
    expect(soServiceSpy.submit).toHaveBeenCalledWith('so-1');
    expect(component.refresh.emit).toHaveBeenCalled();
    expect(alertSpy.success).toHaveBeenCalled();
  });

  it('does not submit when confirm returns false', async () => {
    spyOn(window, 'confirm').and.returnValue(false);
    await component.onSubmit(MOCK_ORDERS[0]);
    expect(soServiceSpy.submit).not.toHaveBeenCalled();
  });

  it('calls cancel service and emits refresh on success', async () => {
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(component.refresh, 'emit');
    soServiceSpy.cancel.and.returnValue(
      Promise.resolve(mockResponse({ ...MOCK_ORDERS[0], status: 'cancelled' as const }))
    );
    await component.onCancel(MOCK_ORDERS[0]);
    expect(soServiceSpy.cancel).toHaveBeenCalledWith('so-1');
    expect(component.refresh.emit).toHaveBeenCalled();
  });

  it('calls softDelete service and emits refresh on success', async () => {
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(component.refresh, 'emit');
    soServiceSpy.softDelete.and.returnValue(Promise.resolve(mockResponse(undefined)));
    await component.onDelete(MOCK_ORDERS[0]);
    expect(soServiceSpy.softDelete).toHaveBeenCalledWith('so-1');
    expect(component.refresh.emit).toHaveBeenCalled();
  });

  it('getStatusClass returns correct classes for each status', () => {
    expect(component.getStatusClass('draft')).toContain('gray');
    expect(component.getStatusClass('submitted')).toContain('blue');
    expect(component.getStatusClass('partial')).toContain('amber');
    expect(component.getStatusClass('completed')).toContain('green');
    expect(component.getStatusClass('cancelled')).toContain('red');
  });

  it('getCustomerName returns customer name from map', () => {
    expect(component.getCustomerName('cust-001')).toBe('Cliente Alpha');
    expect(component.getCustomerName('unknown-id')).toBe('unknown-id');
  });
});
