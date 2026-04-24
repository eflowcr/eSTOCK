import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { LotTraceComponent } from './lot-trace.component';
import { LotService } from '@app/services/lot.service';
import { PdfExportService } from '@app/services/pdf-export.service';
import { LanguageService } from '@app/services/extras/language.service';
import { LotTraceResponse } from '@app/models/lot-trace.model';

function mockResponse<T>(data: T): any {
  return Promise.resolve({ result: { success: true, message: '', endpoint_code: '' }, data });
}

const MOCK_TRACE: LotTraceResponse = {
  lot: {
    id: 'lot-nanoid-1',
    lot_number: 'LOT-001',
    sku: 'SKU-TEST',
    expiration_date: '2027-01-01',
    manufactured_at: '2025-01-01',
    best_before_date: '2026-12-01',
    status: 'active',
  },
  origin: {
    receiving_task_id: 'rt-abc123def',
    supplier: { id: 'sup-1', code: 'PROV-01', name: 'Proveedor S.A.' },
    received_at: '2025-01-15T10:00:00Z',
  },
  movements: [
    {
      id: 'mv-1',
      movement_type: 'inbound',
      sku: 'SKU-TEST',
      location_code: 'A-01',
      quantity: 100,
      before_qty: 0,
      after_qty: 100,
      reference_type: 'receiving_task',
      reference_id: 'rt-abc123def',
      lot_id: 'lot-nanoid-1',
      created_at: '2025-01-15T10:00:00Z',
    },
    {
      id: 'mv-2',
      movement_type: 'outbound',
      sku: 'SKU-TEST',
      location_code: 'A-01',
      quantity: 20,
      before_qty: 100,
      after_qty: 80,
      reference_type: 'picking_task',
      reference_id: 'pk-xyz789',
      lot_id: 'lot-nanoid-1',
      created_at: '2025-02-10T09:00:00Z',
    },
    {
      id: 'mv-3',
      movement_type: 'adjustment',
      sku: 'SKU-TEST',
      location_code: 'A-01',
      quantity: 5,
      before_qty: 80,
      after_qty: 85,
      reference_type: 'adjustment',
      reference_id: 'adj-001',
      lot_id: 'lot-nanoid-1',
      created_at: '2025-03-01T08:00:00Z',
    },
  ],
  current_stock: {
    total_qty: 85,
    by_location: [
      { location: 'A-01', qty: 85 },
    ],
  },
};

const MOCK_TRACE_NO_ORIGIN: LotTraceResponse = {
  ...MOCK_TRACE,
  origin: null,
};

const MOCK_TRACE_DEPLETED: LotTraceResponse = {
  ...MOCK_TRACE,
  current_stock: { total_qty: 0, by_location: [] },
};

const mockLanguageService = { translate: (k: string) => k };

function buildRoute(id: string) {
  return {
    snapshot: { paramMap: { get: () => id } },
  };
}

async function setup(traceData: LotTraceResponse) {
  const lotService = jasmine.createSpyObj('LotService', ['trace']);
  const pdfService = jasmine.createSpyObj('PdfExportService', ['exportLotTrace']);
  lotService.trace.and.returnValue(mockResponse(traceData));
  pdfService.exportLotTrace.and.returnValue(Promise.resolve(new Blob(['pdf'], { type: 'application/pdf' })));

  await TestBed.configureTestingModule({
    imports: [LotTraceComponent],
    providers: [
      provideNoopAnimations(),
      { provide: LotService, useValue: lotService },
      { provide: PdfExportService, useValue: pdfService },
      { provide: LanguageService, useValue: mockLanguageService },
      { provide: ActivatedRoute, useValue: buildRoute('lot-nanoid-1') },
    ],
  }).compileComponents();

  const fixture: ComponentFixture<LotTraceComponent> = TestBed.createComponent(LotTraceComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  const component = fixture.componentInstance;
  return { fixture, component, lotService, pdfService };
}

describe('LotTraceComponent', () => {

  it('creates and calls trace on init', async () => {
    const { component, lotService } = await setup(MOCK_TRACE);
    expect(component).toBeTruthy();
    expect(lotService.trace).toHaveBeenCalledWith('lot-nanoid-1');
  });

  it('renders header with lot_number and sku', async () => {
    const { fixture } = await setup(MOCK_TRACE);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('LOT-001');
    expect(el.textContent).toContain('SKU-TEST');
  });

  it('renders all 3 sections (origin, movements, current_stock)', async () => {
    const { fixture } = await setup(MOCK_TRACE);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('lot_trace.origin.section');
    expect(el.textContent).toContain('lot_trace.movements.section');
    expect(el.textContent).toContain('lot_trace.current_stock.section');
  });

  it('shows origin data when origin is present', async () => {
    const { fixture } = await setup(MOCK_TRACE);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('rt-abc');
    expect(el.textContent).toContain('Proveedor S.A.');
  });

  it('shows 3 movements in timeline', async () => {
    const { component } = await setup(MOCK_TRACE);
    expect(component.movements().length).toBe(3);
  });

  it('shows total_qty in current stock section', async () => {
    const { fixture } = await setup(MOCK_TRACE);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('85');
  });

  it('shows pre-S2 hint when origin is null', async () => {
    const { fixture } = await setup(MOCK_TRACE_NO_ORIGIN);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('lot_trace.origin.unknown');
  });

  it('shows depleted notice when total_qty = 0', async () => {
    const { component } = await setup(MOCK_TRACE_DEPLETED);
    expect(component.isDepleted()).toBeTrue();
  });

  it('stockByLocation sorts qty DESC', async () => {
    const traceMultiLoc: LotTraceResponse = {
      ...MOCK_TRACE,
      current_stock: {
        total_qty: 30,
        by_location: [
          { location: 'B-02', qty: 10 },
          { location: 'A-01', qty: 20 },
        ],
      },
    };
    const { component } = await setup(traceMultiLoc);
    expect(component.stockByLocation()[0].location).toBe('A-01');
    expect(component.stockByLocation()[1].location).toBe('B-02');
  });

  it('exportPdf triggers PdfExportService', async () => {
    const { component, pdfService } = await setup(MOCK_TRACE);
    await component.exportPdf();
    expect(pdfService.exportLotTrace).toHaveBeenCalledWith(MOCK_TRACE);
  });

  it('sets isLoading false after load', async () => {
    const { component } = await setup(MOCK_TRACE);
    expect(component.isLoading()).toBeFalse();
  });

});

describe('LotTraceComponent — empty movements', () => {
  it('shows empty state when 0 movements', async () => {
    const empty: LotTraceResponse = { ...MOCK_TRACE, movements: [] };
    const { component, fixture } = await setup(empty);
    expect(component.movements().length).toBe(0);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('lot_trace.movements.empty');
  });
});
