import { TestBed } from '@angular/core/testing';
import { BackordersService } from './backorders.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';
import { Backorder } from '@app/models/backorder.model';

const MOCK_BACKORDER: Backorder = {
  id: 'bo-001',
  original_sales_order_id: 'so-001',
  article_sku: 'SKU-001',
  remaining_qty: 5,
  status: 'pending',
  created_at: '2026-04-23T00:00:00Z',
  updated_at: '2026-04-23T00:00:00Z',
};

describe('BackordersService', () => {
  let service: BackordersService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'post', 'patch', 'delete']);
    TestBed.configureTestingModule({
      providers: [BackordersService, { provide: FetchService, useValue: fetchSpy }],
    });
    service = TestBed.inject(BackordersService);
  });

  describe('list()', () => {
    it('calls GET /backorders/ without query string when no filters', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.list();
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('/backorders');
      expect(url).not.toContain('?');
    });

    it('appends status filter', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.list({ status: 'pending' });
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('status=pending');
    });

    it('appends article_sku filter', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.list({ article_sku: 'SKU-002' });
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('article_sku=SKU-002');
    });

    it('appends so_id filter (correct backend param name)', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.list({ so_id: 'so-001' });
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('so_id=so-001');
    });
  });

  describe('getById()', () => {
    it('includes id in URL', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(MOCK_BACKORDER)));
      await service.getById('bo-001');
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('bo-001') })
      );
    });
  });

  describe('fulfill()', () => {
    it('calls POST /backorders/:id/fulfill', async () => {
      fetchSpy.post.and.returnValue(
        Promise.resolve(mockResponse({ ...MOCK_BACKORDER, status: 'fulfilled' }))
      );
      await service.fulfill('bo-001');
      const url: string = fetchSpy.post.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('bo-001/fulfill');
    });

    it('returns fulfilled backorder', async () => {
      const fulfilledBO: Backorder = { ...MOCK_BACKORDER, status: 'fulfilled', fulfilled_at: '2026-04-23T01:00:00Z' };
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse(fulfilledBO)));
      const result = await service.fulfill('bo-001');
      expect(result.data.status).toBe('fulfilled');
    });
  });
});
