import { TestBed } from '@angular/core/testing';
import { PurchaseOrdersService } from './purchase-orders.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';
import { PurchaseOrder, SubmitPurchaseOrderResponse } from '@app/models/purchase-order.model';

const MOCK_PO: PurchaseOrder = {
  id: 'po-001',
  po_number: 'PO-2026-001',
  supplier_id: 'sup-001',
  status: 'draft',
  created_at: '2026-04-23T00:00:00Z',
  updated_at: '2026-04-23T00:00:00Z',
};

describe('PurchaseOrdersService', () => {
  let service: PurchaseOrdersService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'post', 'patch', 'delete']);
    TestBed.configureTestingModule({
      providers: [PurchaseOrdersService, { provide: FetchService, useValue: fetchSpy }],
    });
    service = TestBed.inject(PurchaseOrdersService);
  });

  describe('list()', () => {
    it('calls GET /purchase-orders/ without query string when no filters', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.list();
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('/purchase-orders');
      expect(url).not.toContain('?');
    });

    it('appends status filter as query string', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.list({ status: 'draft' });
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('status=draft');
    });

    it('appends multiple filters', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.list({ status: 'submitted', supplier_id: 'sup-abc' });
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('status=submitted');
      expect(url).toContain('supplier_id=sup-abc');
    });
  });

  describe('getById()', () => {
    it('includes id in URL', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(MOCK_PO)));
      await service.getById('po-001');
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('po-001') })
      );
    });
  });

  describe('create()', () => {
    it('calls POST /purchase-orders/ with payload', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse(MOCK_PO)));
      const payload = { supplier_id: 'sup-001', notes: 'Test PO' };
      await service.create(payload);
      expect(fetchSpy.post).toHaveBeenCalledWith(
        jasmine.objectContaining({ values: payload })
      );
    });

    it('POSTs to trailing-slash URL', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse(MOCK_PO)));
      await service.create({ supplier_id: 'sup-001' });
      const url: string = fetchSpy.post.calls.mostRecent().args[0].API_Gateway;
      expect(url).toMatch(/purchase-orders\/$/);
    });
  });

  describe('update()', () => {
    it('calls PATCH /purchase-orders/:id with payload', async () => {
      fetchSpy.patch.and.returnValue(Promise.resolve(mockResponse(MOCK_PO)));
      await service.update('po-001', { notes: 'Updated' });
      const args = fetchSpy.patch.calls.mostRecent().args[0];
      expect(args.API_Gateway).toContain('po-001');
      expect((args as any).values).toEqual({ notes: 'Updated' });
    });
  });

  describe('softDelete()', () => {
    it('calls DELETE /purchase-orders/:id', async () => {
      fetchSpy.delete.and.returnValue(Promise.resolve(mockResponse(undefined)));
      await service.softDelete('po-001');
      expect(fetchSpy.delete).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('po-001') })
      );
    });
  });

  describe('submit()', () => {
    it('calls POST /purchase-orders/:id/submit', async () => {
      const mockSubmitResp: SubmitPurchaseOrderResponse = {
        purchase_order: { ...MOCK_PO, status: 'submitted' },
        receiving_task_id: 'rt-999',
      };
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse(mockSubmitResp)));
      await service.submit('po-001');
      const url: string = fetchSpy.post.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('po-001/submit');
    });
  });

  describe('cancel()', () => {
    it('calls POST /purchase-orders/:id/cancel', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({ ...MOCK_PO, status: 'cancelled' })));
      await service.cancel('po-001');
      const url: string = fetchSpy.post.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('po-001/cancel');
    });
  });
});
