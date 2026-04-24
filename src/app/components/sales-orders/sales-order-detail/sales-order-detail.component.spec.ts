import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { SalesOrderDetailComponent } from './sales-order-detail.component';
import { SalesOrdersService } from '@app/services/sales-orders.service';
import { DeliveryNotesService } from '@app/services/delivery-notes.service';
import { BackordersService } from '@app/services/backorders.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';
import { LoadingService } from '@app/services/extras/loading.service';
import { AuthorizationService } from '@app/services/extras/authorization.service';
import { SalesOrder } from '@app/models/sales-order.model';
import { Backorder } from '@app/models/backorder.model';
import { DeliveryNote } from '@app/models/delivery-note.model';
import { mockResponse } from '../../../../__tests__/mocks/data';
import { SidebarService } from '@app/services';
import { UserPreferencesService } from '@app/services/user-preferences.service';

const MOCK_SO: SalesOrder = {
  id: 'so-detail-1',
  so_number: 'SO-2026-001',
  customer_id: 'cust-001',
  status: 'submitted',
  picking_task_id: 'pt-001',
  created_at: '2026-04-20T10:00:00Z',
  updated_at: '2026-04-20T10:00:00Z',
  submitted_at: '2026-04-20T11:00:00Z',
  customer: { id: 'cust-001', code: 'C001', name: 'Acme Corp' },
  items: [
    {
      id: 'item-1',
      sales_order_id: 'so-detail-1',
      article_sku: 'SKU-001',
      expected_qty: 10,
      picked_qty: 10,
      unit_price: 5.5,
    },
  ],
};

const MOCK_BACKORDER: Backorder = {
  id: 'bo-1',
  original_sales_order_id: 'so-detail-1',
  article_sku: 'SKU-002',
  remaining_qty: 3,
  status: 'pending',
  created_at: '2026-04-20T11:00:00Z',
  updated_at: '2026-04-20T11:00:00Z',
};

const MOCK_DN: DeliveryNote = {
  id: 'dn-001',
  dn_number: 'DN-2026-001',
  sales_order_id: 'so-detail-1',
  customer_id: 'cust-001',
  total_items: 1,
  created_at: '2026-04-20T12:00:00Z',
  updated_at: '2026-04-20T12:00:00Z',
};

describe('SalesOrderDetailComponent', () => {
  let component: SalesOrderDetailComponent;
  let fixture: ComponentFixture<SalesOrderDetailComponent>;
  let soSpy: jasmine.SpyObj<SalesOrdersService>;
  let dnSpy: jasmine.SpyObj<DeliveryNotesService>;
  let boSpy: jasmine.SpyObj<BackordersService>;
  let alertSpy: jasmine.SpyObj<AlertService>;
  let loadingSpy: jasmine.SpyObj<LoadingService>;

  beforeEach(async () => {
    soSpy = jasmine.createSpyObj('SalesOrdersService', ['getById', 'submit', 'cancel', 'softDelete']);
    dnSpy = jasmine.createSpyObj('DeliveryNotesService', ['list']);
    boSpy = jasmine.createSpyObj('BackordersService', ['list']);
    alertSpy = jasmine.createSpyObj('AlertService', ['success', 'error']);
    loadingSpy = jasmine.createSpyObj('LoadingService', ['show', 'hide']);

    soSpy.getById.and.returnValue(Promise.resolve(mockResponse(MOCK_SO)));
    boSpy.list.and.returnValue(Promise.resolve(mockResponse([MOCK_BACKORDER])));
    dnSpy.list.and.returnValue(Promise.resolve(mockResponse([])));

    const langSpy = jasmine.createSpyObj('LanguageService', ['t']);
    langSpy.t.and.callFake((k: string) => k);

    const sidebarSpy = jasmine.createSpyObj('SidebarService', [], {
      desktopCollapsed$: { subscribe: (fn: any) => { fn(false); return { unsubscribe: () => {} }; } },
      mobileOpen$: { subscribe: (fn: any) => { fn(false); return { unsubscribe: () => {} }; } },
    });
    const prefsSpy = jasmine.createSpyObj('UserPreferencesService', ['load']);

    await TestBed.configureTestingModule({
      imports: [SalesOrderDetailComponent, RouterModule.forRoot([]), HttpClientTestingModule],
      providers: [
        provideNoopAnimations(),
        { provide: SalesOrdersService, useValue: soSpy },
        { provide: DeliveryNotesService, useValue: dnSpy },
        { provide: BackordersService, useValue: boSpy },
        { provide: AlertService, useValue: alertSpy },
        { provide: LanguageService, useValue: langSpy },
        { provide: LoadingService, useValue: loadingSpy },
        { provide: SidebarService, useValue: sidebarSpy },
        { provide: UserPreferencesService, useValue: prefsSpy },
        { provide: AuthorizationService, useValue: { isAdmin: () => true, isAuthenticated: () => true, hasPermission: () => true, getCurrentUser: () => ({ name: 'T', last_name: 'U', role: 'Admin', email: 'a@b.com' }) } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => 'so-detail-1' } },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SalesOrderDetailComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads order on init', async () => {
    expect(soSpy.getById).toHaveBeenCalledWith('so-detail-1');
    expect(component.order?.so_number).toBe('SO-2026-001');
  });

  it('loads backorders on init', async () => {
    // Trigger load manually and wait for all promises to settle
    await component.loadOrder('so-detail-1');
    expect(boSpy.list).toHaveBeenCalledWith({ so_id: 'so-detail-1' });
    expect(component.backorders.length).toBe(1);
    expect(component.backorders[0].article_sku).toBe('SKU-002');
  });

  it('getStatusClass returns correct class for submitted', () => {
    expect(component.getStatusClass('submitted')).toContain('blue');
  });

  it('getStatusClass returns correct class for completed', () => {
    expect(component.getStatusClass('completed')).toContain('green');
  });

  it('getBackorderStatusClass returns amber for pending', () => {
    expect(component.getBackorderStatusClass('pending')).toContain('amber');
  });

  it('formatDate returns a formatted string', () => {
    const result = component.formatDate('2026-04-20T00:00:00Z');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('formatDateTime returns a formatted string', () => {
    const result = component.formatDateTime('2026-04-20T10:30:00Z');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('calls submit service on onSubmit() confirm', async () => {
    spyOn(window, 'confirm').and.returnValue(true);
    soSpy.submit.and.returnValue(
      Promise.resolve(mockResponse({ sales_order: { ...MOCK_SO, status: 'submitted' as const }, picking_task_id: 'pt-1' }))
    );
    soSpy.getById.and.returnValue(Promise.resolve(mockResponse(MOCK_SO)));
    await component.onSubmit();
    expect(soSpy.submit).toHaveBeenCalledWith('so-detail-1');
    expect(alertSpy.success).toHaveBeenCalled();
  });

  it('opens edit form on openEditForm()', () => {
    expect(component.isEditOpen).toBeFalse();
    component.openEditForm();
    expect(component.isEditOpen).toBeTrue();
  });
});
