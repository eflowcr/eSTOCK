import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClientsListComponent } from './clients-list.component';
import { ClientsService } from '@app/services/clients.service';
import { AlertService } from '@app/services/extras/alert.service';
import { AuthorizationService } from '@app/services/extras/authorization.service';
import { LanguageService } from '@app/services/extras/language.service';
import { Client } from '@app/models/client.model';

const okResponse = (data: any) => Promise.resolve({ result: { success: true }, data });

const MOCK_CLIENTS: Client[] = [
  { id: '1', tenant_id: 't1', type: 'supplier', code: 'PROV-001', name: 'Proveedor A', is_active: true, created_at: '', updated_at: '' },
  { id: '2', tenant_id: 't1', type: 'customer', code: 'CLI-001', name: 'Cliente B', is_active: true, created_at: '', updated_at: '' },
  { id: '3', tenant_id: 't1', type: 'both', code: 'BOTH-001', name: 'Empresa C', is_active: false, created_at: '', updated_at: '' },
];

const mockClientsService = {
  softDelete: () => okResponse(null),
};

const mockAlertService = { success: jasmine.createSpy('success'), error: jasmine.createSpy('error') };
const mockAuthorizationService = { isAdmin: () => true };
const mockLanguageService = { t: (key: string) => key };

describe('ClientsListComponent', () => {
  let component: ClientsListComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, RouterModule.forRoot([]), ClientsListComponent],
      providers: [
        { provide: ClientsService, useValue: mockClientsService },
        { provide: AlertService, useValue: mockAlertService },
        { provide: AuthorizationService, useValue: mockAuthorizationService },
        { provide: LanguageService, useValue: mockLanguageService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ClientsListComponent);
    component = fixture.componentInstance;
    component.clients = MOCK_CLIENTS;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('shows all clients by default (status=active filter)', () => {
    expect(component.filteredClients.length).toBe(2);
  });

  it('filters by type=supplier', () => {
    component.typeFilter = 'supplier';
    expect(component.filteredClients.every((c) => c.type === 'supplier')).toBe(true);
  });

  it('filters by status=all shows inactive too', () => {
    component.statusFilter = 'all';
    expect(component.filteredClients.length).toBe(3);
  });

  it('filters by search term on name', () => {
    component.statusFilter = 'all';
    component.searchTerm = 'empresa';
    expect(component.filteredClients.length).toBe(1);
    expect(component.filteredClients[0].name).toBe('Empresa C');
  });

  it('filters by search term on code', () => {
    component.statusFilter = 'all';
    component.searchTerm = 'PROV';
    expect(component.filteredClients.length).toBe(1);
  });

  it('typeBadgeClass returns correct class for supplier', () => {
    expect(component.typeBadgeClass('supplier')).toContain('blue');
  });

  it('typeBadgeClass returns correct class for customer', () => {
    expect(component.typeBadgeClass('customer')).toContain('green');
  });

  it('typeBadgeClass returns correct class for both', () => {
    expect(component.typeBadgeClass('both')).toContain('purple');
  });

  it('isAdmin returns true from mock', () => {
    expect(component.isAdmin()).toBe(true);
  });
});
