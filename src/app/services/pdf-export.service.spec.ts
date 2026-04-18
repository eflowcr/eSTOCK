import { TestBed } from '@angular/core/testing';
import { PdfExportService } from './pdf-export.service';
import { LotTraceResponse } from '@app/models/lot-trace.model';

const MOCK_DATA: LotTraceResponse = {
  lot: {
    id: 'lot-1',
    lot_number: 'LOT-PDF-001',
    sku: 'SKU-PDF',
    expiration_date: '2027-06-30',
    status: 'active',
  },
  origin: {
    receiving_task_id: 'rt-pdf-abc',
    supplier: { id: 's1', code: 'PROV', name: 'Proveedor Test' },
    received_at: '2025-01-10T09:00:00Z',
  },
  movements: [
    {
      id: 'mv-1',
      type: 'INBOUND',
      sku: 'SKU-PDF',
      location: 'A-01',
      quantity: 50,
      before_qty: 0,
      after_qty: 50,
      reference_type: 'receiving_task',
      reference_id: 'rt-pdf-abc',
      created_at: '2025-01-10T09:00:00Z',
    },
  ],
  current_stock: {
    total_qty: 50,
    by_location: [{ location: 'A-01', qty: 50 }],
  },
};

describe('PdfExportService', () => {
  let service: PdfExportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PdfExportService);
  });

  it('creates the service', () => {
    expect(service).toBeTruthy();
  });

  it('exportLotTrace returns a Blob', async () => {
    const blob = await service.exportLotTrace(MOCK_DATA);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
  });

  it('returned Blob has non-zero size', async () => {
    const blob = await service.exportLotTrace(MOCK_DATA);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('generates PDF with null origin without throwing', async () => {
    const noOrigin: LotTraceResponse = { ...MOCK_DATA, origin: null };
    const blob = await service.exportLotTrace(noOrigin);
    expect(blob).toBeInstanceOf(Blob);
  });

  it('generates PDF with empty movements without throwing', async () => {
    const noMov: LotTraceResponse = { ...MOCK_DATA, movements: [] };
    const blob = await service.exportLotTrace(noMov);
    expect(blob).toBeInstanceOf(Blob);
  });

  it('generates PDF with many movements (pagination)', async () => {
    const manyMovs: LotTraceResponse = {
      ...MOCK_DATA,
      movements: Array.from({ length: 60 }, (_, i) => ({
        id: `mv-${i}`,
        type: 'INBOUND' as const,
        sku: 'SKU-PDF',
        location: 'A-01',
        quantity: 1,
        created_at: '2025-01-15T10:00:00Z',
      })),
    };
    const blob = await service.exportLotTrace(manyMovs);
    expect(blob.size).toBeGreaterThan(0);
  });
});
