import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { provideRouter } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DeliveryNotesListComponent } from './delivery-notes-list.component';
import { DeliveryNotesService } from '@app/services/delivery-notes.service';
import { ClientsService } from '@app/services/clients.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';
import { DeliveryNote } from '@app/models/delivery-note.model';
import { mockResponse } from '../../../../__tests__/mocks/data';

const MOCK_DN: DeliveryNote = {
  id: 'dn-001',
  dn_number: 'DN-2026-001',
  sales_order_id: 'so-001',
  customer_id: 'cust-001',
  total_items: 3,
  pdf_url: 'https://example.com/dn-001.pdf',
  created_at: '2026-04-23T00:00:00Z',
  updated_at: '2026-04-23T00:00:00Z',
  customer: { id: 'cust-001', code: 'C001', name: 'Acme Corp' },
};

const MOCK_DN_NO_PDF: DeliveryNote = {
  id: 'dn-002',
  dn_number: 'DN-2026-002',
  sales_order_id: 'so-002',
  customer_id: 'cust-002',
  total_items: 1,
  created_at: '2026-04-23T00:00:00Z',
  updated_at: '2026-04-23T00:00:00Z',
};

describe('DeliveryNotesListComponent', () => {
  let component: DeliveryNotesListComponent;
  let dnSpy: jasmine.SpyObj<DeliveryNotesService>;
  let clientsSpy: jasmine.SpyObj<ClientsService>;
  let alertSpy: jasmine.SpyObj<AlertService>;
  let langSpy: jasmine.SpyObj<LanguageService>;

  beforeEach(async () => {
    dnSpy = jasmine.createSpyObj('DeliveryNotesService', ['list', 'getById', 'downloadPdf']);
    clientsSpy = jasmine.createSpyObj('ClientsService', ['list']);
    alertSpy = jasmine.createSpyObj('AlertService', ['error', 'success']);
    langSpy = jasmine.createSpyObj('LanguageService', ['t']);
    langSpy.t.and.callFake((key: string) => key);

    dnSpy.list.and.returnValue(Promise.resolve(mockResponse([MOCK_DN, MOCK_DN_NO_PDF])));
    clientsSpy.list.and.returnValue(Promise.resolve(mockResponse([])));

    await TestBed.configureTestingModule({
      imports: [DeliveryNotesListComponent],
      providers: [
        provideRouter([]),
        { provide: DeliveryNotesService, useValue: dnSpy },
        { provide: ClientsService, useValue: clientsSpy },
        { provide: AlertService, useValue: alertSpy },
        { provide: LanguageService, useValue: langSpy },
      ],
    })
      .overrideComponent(DeliveryNotesListComponent, {
        set: {
          imports: [CommonModule, FormsModule, RouterModule],
          schemas: [NO_ERRORS_SCHEMA],
        },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(DeliveryNotesListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit calls loadDeliveryNotes and loadClients', fakeAsync(() => {
    component.ngOnInit();
    tick();
    expect(dnSpy.list).toHaveBeenCalled();
    expect(clientsSpy.list).toHaveBeenCalled();
  }));

  it('loadDeliveryNotes populates deliveryNotes array', fakeAsync(() => {
    component.ngOnInit();
    tick();
    expect(component.deliveryNotes.length).toBe(2);
  }));

  it('getPdfStatusBadge returns green badge when pdf_url is set', () => {
    const badge = component.getPdfStatusBadge(MOCK_DN);
    expect(badge.className).toContain('green');
  });

  it('getPdfStatusBadge returns amber badge when pdf_url is missing', () => {
    const badge = component.getPdfStatusBadge(MOCK_DN_NO_PDF);
    expect(badge.className).toContain('amber');
  });

  it('getClientName returns customer.name if embedded', () => {
    const name = component.getClientName(MOCK_DN);
    expect(name).toBe('Acme Corp');
  });

  it('getClientName falls back to customer_id if no embed', () => {
    const name = component.getClientName(MOCK_DN_NO_PDF);
    expect(name).toBe('cust-002');
  });

  it('clearFilters resets all filter fields and reloads', fakeAsync(() => {
    component.filterCustomerId = 'cust-001';
    component.filterSoNumber = 'SO-001';
    component.currentPage = 3;
    component.clearFilters();
    tick();
    expect(component.filterCustomerId).toBe('');
    expect(component.filterSoNumber).toBe('');
    expect(component.currentPage).toBe(1);
  }));

  it('hasActiveFilters is true when any filter is set', () => {
    component.filterSoNumber = 'SO-001';
    expect(component.hasActiveFilters).toBeTrue();
  });

  it('hasActiveFilters is false when no filters', () => {
    component.filterCustomerId = '';
    component.filterSoNumber = '';
    component.filterFrom = '';
    component.filterTo = '';
    expect(component.hasActiveFilters).toBeFalse();
  });

  it('downloadPdf triggers blob download via createObjectURL', fakeAsync(async () => {
    const mockBlob = new Blob(['%PDF'], { type: 'application/pdf' });
    dnSpy.downloadPdf.and.returnValue(Promise.resolve(mockBlob));

    const createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:test');
    const revokeObjectURLSpy = spyOn(URL, 'revokeObjectURL').and.stub();

    const mockLink = document.createElement('a');
    spyOn(document.body, 'appendChild').and.stub();
    spyOn(document.body, 'removeChild').and.stub();
    spyOn(document, 'createElement').and.returnValue(mockLink as any);
    spyOn(mockLink, 'click').and.stub();

    const fakeEvent = { stopPropagation: jasmine.createSpy() } as unknown as Event;
    component.ngOnInit();
    tick();
    await component.downloadPdf(MOCK_DN, fakeEvent);

    expect(fakeEvent.stopPropagation).toHaveBeenCalled();
    expect(dnSpy.downloadPdf).toHaveBeenCalledWith('dn-001');
    expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob);
    expect(revokeObjectURLSpy).toHaveBeenCalled();
  }));

  it('downloadPdf does nothing if pdf_url not set', fakeAsync(async () => {
    const fakeEvent = { stopPropagation: jasmine.createSpy() } as unknown as Event;
    await component.downloadPdf(MOCK_DN_NO_PDF, fakeEvent);
    expect(dnSpy.downloadPdf).not.toHaveBeenCalled();
  }));

  it('formatDate returns "-" for undefined', () => {
    expect(component.formatDate(undefined)).toBe('-');
  });
});
