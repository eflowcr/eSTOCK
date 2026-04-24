import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DeliveryNoteDetailComponent } from './delivery-note-detail.component';
import { DeliveryNotesService } from '@app/services/delivery-notes.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';
import { DeliveryNote } from '@app/models/delivery-note.model';
import { mockResponse } from '../../../../__tests__/mocks/data';

const MOCK_DN_WITH_PDF: DeliveryNote = {
  id: 'dn-001',
  dn_number: 'DN-2026-001',
  sales_order_id: 'so-001',
  customer_id: 'cust-001',
  total_items: 2,
  pdf_url: 'https://example.com/dn-001.pdf',
  pdf_generated_at: '2026-04-23T10:00:00Z',
  delivered_at: '2026-04-23T12:00:00Z',
  signed_by: 'John Doe',
  created_at: '2026-04-23T00:00:00Z',
  updated_at: '2026-04-23T00:00:00Z',
  customer: { id: 'cust-001', code: 'C001', name: 'Acme Corp' },
  items: [
    { id: 'item-1', delivery_note_id: 'dn-001', article_sku: 'SKU-001', qty: 5, lot_numbers: ['LOT-A', 'LOT-B'] },
  ],
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

function makeRoute(id: string) {
  return { snapshot: { paramMap: { get: () => id } } };
}

describe('DeliveryNoteDetailComponent', () => {
  let component: DeliveryNoteDetailComponent;
  let dnSpy: jasmine.SpyObj<DeliveryNotesService>;
  let alertSpy: jasmine.SpyObj<AlertService>;
  let langSpy: jasmine.SpyObj<LanguageService>;

  async function setup(id: string, dnData: DeliveryNote) {
    dnSpy = jasmine.createSpyObj('DeliveryNotesService', ['getById', 'downloadPdf']);
    alertSpy = jasmine.createSpyObj('AlertService', ['error', 'success']);
    langSpy = jasmine.createSpyObj('LanguageService', ['t']);
    langSpy.t.and.callFake((key: string) => key);

    dnSpy.getById.and.returnValue(Promise.resolve(mockResponse(dnData)));

    await TestBed.configureTestingModule({
      imports: [DeliveryNoteDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: makeRoute(id) },
        { provide: DeliveryNotesService, useValue: dnSpy },
        { provide: AlertService, useValue: alertSpy },
        { provide: LanguageService, useValue: langSpy },
      ],
    })
      .overrideComponent(DeliveryNoteDetailComponent, {
        set: {
          imports: [CommonModule, RouterModule],
          schemas: [NO_ERRORS_SCHEMA],
        },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(DeliveryNoteDetailComponent);
    component = fixture.componentInstance;
  }

  afterEach(() => {
    if (component) component.stopPolling();
    TestBed.resetTestingModule();
  });

  it('should create', async () => {
    await setup('dn-001', MOCK_DN_WITH_PDF);
    expect(component).toBeTruthy();
  });

  it('ngOnInit loads delivery note by id from route', fakeAsync(async () => {
    await setup('dn-001', MOCK_DN_WITH_PDF);
    component.ngOnInit();
    tick();
    expect(dnSpy.getById).toHaveBeenCalledWith('dn-001');
    expect(component.deliveryNote).toEqual(MOCK_DN_WITH_PDF);
  }));

  it('does NOT start polling when pdf_url is present', fakeAsync(async () => {
    await setup('dn-001', MOCK_DN_WITH_PDF);
    component.ngOnInit();
    tick();
    expect(component.isPolling).toBeFalse();
  }));

  it('starts polling when pdf_url is missing', fakeAsync(async () => {
    await setup('dn-002', MOCK_DN_NO_PDF);
    component.ngOnInit();
    tick();
    expect(component.isPolling).toBeTrue();
    component.stopPolling();
  }));

  it('polling stops when pdf_url becomes available', fakeAsync(async () => {
    await setup('dn-002', MOCK_DN_NO_PDF);

    dnSpy.getById.and.returnValues(
      Promise.resolve(mockResponse(MOCK_DN_NO_PDF)),
      Promise.resolve(mockResponse({ ...MOCK_DN_NO_PDF, pdf_url: 'https://example.com/dn-002.pdf' })),
    );

    component.ngOnInit();
    tick();
    expect(component.isPolling).toBeTrue();

    tick(3000);
    tick();
    expect(component.deliveryNote?.pdf_url).toBe('https://example.com/dn-002.pdf');
    expect(component.isPolling).toBeFalse();
  }));

  it('polling stops after MAX_RETRIES without pdf_url', fakeAsync(async () => {
    await setup('dn-002', MOCK_DN_NO_PDF);
    dnSpy.getById.and.returnValue(Promise.resolve(mockResponse(MOCK_DN_NO_PDF)));

    component.ngOnInit();
    tick();
    expect(component.isPolling).toBeTrue();

    for (let i = 0; i < 10; i++) {
      tick(3000);
      tick();
    }
    expect(component.isPolling).toBeFalse();
    expect(component.retryCount).toBe(10);
  }));

  it('downloadPdf calls service and triggers browser download', fakeAsync(async () => {
    await setup('dn-001', MOCK_DN_WITH_PDF);
    component.ngOnInit();
    tick();

    const mockBlob = new Blob(['%PDF'], { type: 'application/pdf' });
    dnSpy.downloadPdf.and.returnValue(Promise.resolve(mockBlob));

    const createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:test');
    const revokeObjectURLSpy = spyOn(URL, 'revokeObjectURL').and.stub();
    const mockLink = document.createElement('a');
    spyOn(document.body, 'appendChild').and.stub();
    spyOn(document.body, 'removeChild').and.stub();
    spyOn(document, 'createElement').and.returnValue(mockLink as any);
    spyOn(mockLink, 'click').and.stub();

    await component.downloadPdf();

    expect(dnSpy.downloadPdf).toHaveBeenCalledWith('dn-001');
    expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob);
    expect(revokeObjectURLSpy).toHaveBeenCalled();
    expect(component.isDownloading).toBeFalse();
  }));

  it('downloadPdf does nothing if pdf_url not set', fakeAsync(async () => {
    await setup('dn-002', MOCK_DN_NO_PDF);
    component.ngOnInit();
    tick();
    component.stopPolling();

    await component.downloadPdf();
    expect(dnSpy.downloadPdf).not.toHaveBeenCalled();
  }));

  it('formatDate returns "-" for undefined', async () => {
    await setup('dn-001', MOCK_DN_WITH_PDF);
    expect(component.formatDate(undefined)).toBe('-');
  });

  it('formatDateTime returns "-" for undefined', async () => {
    await setup('dn-001', MOCK_DN_WITH_PDF);
    expect(component.formatDateTime(undefined)).toBe('-');
  });

  it('retryPdfNow resets retryCount and restarts polling', fakeAsync(async () => {
    await setup('dn-002', MOCK_DN_NO_PDF);
    dnSpy.getById.and.returnValue(Promise.resolve(mockResponse(MOCK_DN_NO_PDF)));

    component.ngOnInit();
    tick();
    component.retryCount = 5;
    component.retryPdfNow();
    expect(component.retryCount).toBe(0);
    expect(component.isPolling).toBeTrue();
    component.stopPolling();
  }));
});
