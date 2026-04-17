import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ClientDetailComponent } from './client-detail.component';
import { ClientsService } from '@app/services/clients.service';
import { AlertService } from '@app/services/extras/alert.service';
import { AuthorizationService } from '@app/services/extras/authorization.service';
import { LanguageService } from '@app/services/extras/language.service';
import { Client } from '@app/models/client.model';

const MOCK_CLIENT_SUPPLIER: Client = {
  id: '1', tenant_id: 't1', type: 'supplier', code: 'PROV-001', name: 'Proveedor A', is_active: true, created_at: '', updated_at: ''
};
const MOCK_CLIENT_CUSTOMER: Client = {
  id: '2', tenant_id: 't1', type: 'customer', code: 'CLI-001', name: 'Cliente B', is_active: true, created_at: '', updated_at: ''
};
const MOCK_CLIENT_BOTH: Client = {
  id: '3', tenant_id: 't1', type: 'both', code: 'BOTH-001', name: 'Empresa C', is_active: true, created_at: '', updated_at: ''
};

const okResponse = (data: any) => Promise.resolve({ result: { success: true }, data });
const mockClientsService = { getById: () => okResponse(MOCK_CLIENT_SUPPLIER) };
const mockAlertService = { success: jasmine.createSpy('success'), error: jasmine.createSpy('error') };
const mockAuthorizationService = { isAdmin: () => true, isAuthenticated: () => true, hasPermission: () => true, getCurrentUser: () => ({ name: 'Test', last_name: 'User', role: 'Admin', email: 'test@test.com' }) };
const mockLanguageService = { t: (key: string) => key };

function createComponent(client: Client) {
  const svc = { ...mockClientsService, getById: () => okResponse(client) };
  const fixture = TestBed.createComponent(ClientDetailComponent);
  const comp = fixture.componentInstance;
  comp.client = client;
  comp.isLoading = false;
  fixture.detectChanges();
  return comp;
}

describe('ClientDetailComponent — tabs', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, RouterModule.forRoot([]), HttpClientTestingModule, ClientDetailComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ClientsService, useValue: mockClientsService },
        { provide: AlertService, useValue: mockAlertService },
        { provide: AuthorizationService, useValue: mockAuthorizationService },
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } },
      ],
    }).compileComponents();
  });

  it('creates the component', () => {
    const comp = createComponent(MOCK_CLIENT_SUPPLIER);
    expect(comp).toBeTruthy();
  });

  it('defaults to general tab', () => {
    const comp = createComponent(MOCK_CLIENT_SUPPLIER);
    expect(comp.activeTab).toBe('general');
  });

  it('can switch to history tab', () => {
    const comp = createComponent(MOCK_CLIENT_SUPPLIER);
    comp.activeTab = 'history';
    expect(comp.activeTab).toBe('history');
  });

  it('showReceivingHistory is true for supplier', () => {
    const comp = createComponent(MOCK_CLIENT_SUPPLIER);
    expect(comp.showReceivingHistory()).toBe(true);
    expect(comp.showPickingHistory()).toBe(false);
  });

  it('showPickingHistory is true for customer', () => {
    const comp = createComponent(MOCK_CLIENT_CUSTOMER);
    expect(comp.showPickingHistory()).toBe(true);
    expect(comp.showReceivingHistory()).toBe(false);
  });

  it('both showReceivingHistory and showPickingHistory for both type', () => {
    const comp = createComponent(MOCK_CLIENT_BOTH);
    expect(comp.showReceivingHistory()).toBe(true);
    expect(comp.showPickingHistory()).toBe(true);
  });
});
