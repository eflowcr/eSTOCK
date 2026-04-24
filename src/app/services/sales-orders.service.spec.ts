import { TestBed } from '@angular/core/testing';
import { SalesOrdersService } from './sales-orders.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';
import { SalesOrder, SubmitSalesOrderResponse } from '@app/models/sales-order.model';

const MOCK_SO: SalesOrder = {
  id: 'so-001',
  so_number: 'SO-2026-001',
  customer_id: 'cust-001',
  status: 'draft',
  created_at: '2026-04-23T00:00:00Z',
  updated_at: '2026-04-23T00:00:00Z',
};

describe('SalesOrdersService', () => {
  let service: SalesOrdersService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'post', 'patch', 'delete']);
    TestBed.configureTestingModule({
      providers: [SalesOrdersService, { provide: FetchService, useValue: fetchSpy }],
    });
    service = TestBed.inject(SalesOrdersService);
  });

  describe('list()', () => {
    it('calls GET /sales-orders/ without query string when no filters', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.list();
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('/sales-orders');
      expect(url).not.toContain('?');
    });

    it('appends status filter as query string', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.list({ status: 'submitted' });
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('status=submitted');
    });

    it('appends multiple filters', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.list({ status: 'partial', customer_id: 'cust-xyz' });
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('status=partial');
      expect(url).toContain('customer_id=cust-xyz');
    });
  });

  describe('getById()', () => {
    it('includes id in URL', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(MOCK_SO)));
      await service.getById('so-001');
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('so-001') })
      );
    });
  });

  describe('create()', () => {
    it('calls POST /sales-orders/ with payload', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse(MOCK_SO)));
      const payload = { customer_id: 'cust-001', notes: 'Test SO' };
      await service.create(payload);
      expect(fetchSpy.post).toHaveBeenCalledWith(
        jasmine.objectContaining({ values: payload })
      );
    });

    it('POSTs to trailing-slash URL', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse(MOCK_SO)));
      await service.create({ customer_id: 'cust-001' });
      const url: string = fetchSpy.post.calls.mostRecent().args[0].API_Gateway;
      expect(url).toMatch(/sales-orders\/$/);
    });
  });

  describe('update()', () => {
    it('calls PATCH /sales-orders/:id with payload', async () => {
      fetchSpy.patch.and.returnValue(Promise.resolve(mockResponse(MOCK_SO)));
      await service.update('so-001', { notes: 'Updated' });
      const args = fetchSpy.patch.calls.mostRecent().args[0];
      expect(args.API_Gateway).toContain('so-001');
      expect((args as any).values).toEqual({ notes: 'Updated' });
    });
  });

  describe('softDelete()', () => {
    it('calls DELETE /sales-orders/:id', async () => {
      fetchSpy.delete.and.returnValue(Promise.resolve(mockResponse(undefined)));
      await service.softDelete('so-001');
      expect(fetchSpy.delete).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('so-001') })
      );
    });
  });

  describe('submit()', () => {
    it('calls POST /sales-orders/:id/confirm (backend endpoint)', async () => {
      const mockSubmitResp: SubmitSalesOrderResponse = {
        sales_order: { ...MOCK_SO, status: 'submitted' },
        picking_task_id: 'pt-999',
      };
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse(mockSubmitResp)));
      await service.submit('so-001');
      const url: string = fetchSpy.post.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('so-001/confirm');
    });
  });

  describe('confirm() [deprecated alias for submit]', () => {
    it('calls POST /sales-orders/:id/confirm', async () => {
      const mockSubmitResp: SubmitSalesOrderResponse = {
        sales_order: { ...MOCK_SO, status: 'submitted' },
        picking_task_id: 'pt-999',
      };
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse(mockSubmitResp)));
      await service.confirm('so-001');
      const url: string = fetchSpy.post.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('so-001/confirm');
    });
  });

  describe('cancel()', () => {
    it('calls POST /sales-orders/:id/cancel', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({ ...MOCK_SO, status: 'cancelled' })));
      await service.cancel('so-001');
      const url: string = fetchSpy.post.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('so-001/cancel');
    });
  });
});
