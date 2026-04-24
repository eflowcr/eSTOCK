import { TestBed } from '@angular/core/testing';
import { DeliveryNotesService } from './delivery-notes.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';
import { DeliveryNote } from '@app/models/delivery-note.model';

const MOCK_DN: DeliveryNote = {
  id: 'dn-001',
  dn_number: 'DN-2026-001',
  sales_order_id: 'so-001',
  customer_id: 'cust-001',
  total_items: 3,
  created_at: '2026-04-23T00:00:00Z',
  updated_at: '2026-04-23T00:00:00Z',
};

describe('DeliveryNotesService', () => {
  let service: DeliveryNotesService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'post', 'patch', 'delete', 'download']);
    TestBed.configureTestingModule({
      providers: [DeliveryNotesService, { provide: FetchService, useValue: fetchSpy }],
    });
    service = TestBed.inject(DeliveryNotesService);
  });

  describe('list()', () => {
    it('calls GET /delivery-notes/ without query string when no filters', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.list();
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('/delivery-notes');
      expect(url).not.toContain('?');
    });

    it('appends customer_id filter', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.list({ customer_id: 'cust-abc' });
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('customer_id=cust-abc');
    });

    it('appends sales_order_id filter', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.list({ sales_order_id: 'so-123' });
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('sales_order_id=so-123');
    });

    it('appends so_number filter (backend param name)', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.list({ so_number: 'SO-2026-001' });
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('so_number=SO-2026-001');
    });
  });

  describe('getById()', () => {
    it('includes id in URL', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(MOCK_DN)));
      await service.getById('dn-001');
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('dn-001') })
      );
    });
  });

  describe('downloadPdf()', () => {
    it('calls download with /delivery-notes/:id/pdf path', async () => {
      const mockBlob = new Blob(['%PDF'], { type: 'application/pdf' });
      fetchSpy.download.and.returnValue(Promise.resolve(mockBlob));
      const result = await service.downloadPdf('dn-001');
      expect(fetchSpy.download).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('dn-001/pdf') })
      );
      expect(result).toBe(mockBlob);
    });

    it('returns Blob from download', async () => {
      const mockBlob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
      fetchSpy.download.and.returnValue(Promise.resolve(mockBlob));
      const blob = await service.downloadPdf('dn-002');
      expect(blob instanceof Blob).toBeTrue();
    });
  });
});
