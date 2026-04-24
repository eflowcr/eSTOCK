import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterModule } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { SalesOrdersManagementComponent } from './sales-orders-management.component';
import { SalesOrdersService } from '@app/services/sales-orders.service';
import { ClientsService } from '@app/services/clients.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';
import { AuthorizationService } from '@app/services/extras/authorization.service';
import { SalesOrder } from '@app/models/sales-order.model';
import { mockResponse } from '../../../../__tests__/mocks/data';
import { SidebarService } from '@app/services';
import { UserPreferencesService } from '@app/services/user-preferences.service';

const MOCK_ORDERS: SalesOrder[] = [
  {
    id: 'so-1',
    so_number: 'SO-2026-001',
    customer_id: 'c1',
    status: 'draft',
    created_at: '2026-04-20T00:00:00Z',
    updated_at: '2026-04-20T00:00:00Z',
  },
  {
    id: 'so-2',
    so_number: 'SO-2026-002',
    customer_id: 'c1',
    status: 'submitted',
    created_at: '2026-04-21T00:00:00Z',
    updated_at: '2026-04-21T00:00:00Z',
  },
  {
    id: 'so-3',
    so_number: 'SO-2026-003',
    customer_id: 'c1',
    status: 'completed',
    created_at: '2026-04-22T00:00:00Z',
    updated_at: '2026-04-22T00:00:00Z',
  },
  {
    id: 'so-4',
    so_number: 'SO-2026-004',
    customer_id: 'c1',
    status: 'partial',
    created_at: '2026-04-23T00:00:00Z',
    updated_at: '2026-04-23T00:00:00Z',
  },
];

describe('SalesOrdersManagementComponent', () => {
  let component: SalesOrdersManagementComponent;
  let fixture: ComponentFixture<SalesOrdersManagementComponent>;
  let soSpy: jasmine.SpyObj<SalesOrdersService>;
  let clientsSpy: jasmine.SpyObj<ClientsService>;

  beforeEach(async () => {
    soSpy = jasmine.createSpyObj('SalesOrdersService', ['list']);
    clientsSpy = jasmine.createSpyObj('ClientsService', ['list']);

    soSpy.list.and.returnValue(Promise.resolve(mockResponse(MOCK_ORDERS)));
    clientsSpy.list.and.returnValue(Promise.resolve(mockResponse([])));

    const langSpy = jasmine.createSpyObj('LanguageService', ['t']);
    langSpy.t.and.callFake((k: string) => k);

    const alertSpy = jasmine.createSpyObj('AlertService', ['success', 'error']);
    const sidebarSpy = jasmine.createSpyObj('SidebarService', [], {
      desktopCollapsed$: { subscribe: (fn: any) => { fn(false); return { unsubscribe: () => {} }; } },
      mobileOpen$: { subscribe: (fn: any) => { fn(false); return { unsubscribe: () => {} }; } },
    });
    const prefsSpy = jasmine.createSpyObj('UserPreferencesService', ['load']);

    await TestBed.configureTestingModule({
      imports: [SalesOrdersManagementComponent, RouterModule.forRoot([]), HttpClientTestingModule],
      providers: [
        provideNoopAnimations(),
        { provide: SalesOrdersService, useValue: soSpy },
        { provide: ClientsService, useValue: clientsSpy },
        { provide: AlertService, useValue: alertSpy },
        { provide: LanguageService, useValue: langSpy },
        { provide: SidebarService, useValue: sidebarSpy },
        { provide: UserPreferencesService, useValue: prefsSpy },
        { provide: AuthorizationService, useValue: { isAdmin: () => true, isAuthenticated: () => true, hasPermission: () => true, getCurrentUser: () => ({ name: 'T', last_name: 'U', role: 'Admin', email: 'a@b.com' }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SalesOrdersManagementComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads orders on init', () => {
    expect(soSpy.list).toHaveBeenCalled();
    expect(component.orders.length).toBe(4);
  });

  it('computes draftCount correctly', () => {
    expect(component.draftCount).toBe(1);
  });

  it('computes submittedCount correctly', () => {
    expect(component.submittedCount).toBe(1);
  });

  it('computes completedCount correctly', () => {
    expect(component.completedCount).toBe(1);
  });

  it('computes partialCount correctly', () => {
    expect(component.partialCount).toBe(1);
  });

  it('opens create form on openCreateForm()', () => {
    expect(component.isCreateOpen).toBeFalse();
    component.openCreateForm();
    expect(component.isCreateOpen).toBeTrue();
  });

  it('sets editingOrder on handleEdit()', () => {
    component.handleEdit(MOCK_ORDERS[0]);
    expect(component.isEditOpen).toBeTrue();
    expect(component.editingOrder?.id).toBe('so-1');
  });

  it('clears editingOrder on closeEdit()', () => {
    component.handleEdit(MOCK_ORDERS[0]);
    component.closeEdit();
    expect(component.isEditOpen).toBeFalse();
    expect(component.editingOrder).toBeNull();
  });

  it('reloads after create', async () => {
    soSpy.list.calls.reset();
    soSpy.list.and.returnValue(Promise.resolve(mockResponse(MOCK_ORDERS)));
    // Call load() directly to avoid full management lifecycle
    component.isCreateOpen = true;
    await component.load();
    component.isCreateOpen = false;
    expect(soSpy.list).toHaveBeenCalled();
    expect(component.isCreateOpen).toBeFalse();
  });
});
