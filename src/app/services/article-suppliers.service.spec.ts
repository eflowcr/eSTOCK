import { TestBed } from '@angular/core/testing';
import { ArticleSuppliersService } from './article-suppliers.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';
import { ArticleSupplier } from '@app/models/article-supplier.model';

const MOCK_ARTICLE_SUPPLIER: ArticleSupplier = {
  id: 'as-001',
  article_sku: 'SKU-001',
  supplier_id: 'sup-001',
  is_preferred: true,
  lead_time_days: 7,
  unit_cost: 12.5,
  created_at: '2026-04-23T00:00:00Z',
  updated_at: '2026-04-23T00:00:00Z',
};

describe('ArticleSuppliersService', () => {
  let service: ArticleSuppliersService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'post', 'patch', 'delete']);
    TestBed.configureTestingModule({
      providers: [ArticleSuppliersService, { provide: FetchService, useValue: fetchSpy }],
    });
    service = TestBed.inject(ArticleSuppliersService);
  });

  describe('list()', () => {
    it('calls GET /article-suppliers/ without query string when no filters', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.list();
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('/article-suppliers');
      expect(url).not.toContain('?');
    });

    it('appends supplier_id filter', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.list({ supplier_id: 'sup-abc' });
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('supplier_id=sup-abc');
    });

    it('appends is_preferred filter', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.list({ is_preferred: true });
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('is_preferred=true');
    });
  });

  describe('getById()', () => {
    it('includes id in URL', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(MOCK_ARTICLE_SUPPLIER)));
      await service.getById('as-001');
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('as-001') })
      );
    });
  });

  describe('getBySku()', () => {
    it('calls GET with article_sku query param', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([MOCK_ARTICLE_SUPPLIER])));
      await service.getBySku('SKU-001');
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('article_sku=SKU-001');
    });

    it('URL-encodes the SKU', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.getBySku('SKU 001');
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('article_sku=SKU%20001');
    });
  });

  describe('create()', () => {
    it('calls POST /article-suppliers/ with payload', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse(MOCK_ARTICLE_SUPPLIER)));
      const payload = { article_sku: 'SKU-001', supplier_id: 'sup-001', is_preferred: true };
      await service.create(payload);
      expect(fetchSpy.post).toHaveBeenCalledWith(
        jasmine.objectContaining({ values: payload })
      );
    });

    it('POSTs to trailing-slash URL', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse(MOCK_ARTICLE_SUPPLIER)));
      await service.create({ article_sku: 'SKU-001', supplier_id: 'sup-001' });
      const url: string = fetchSpy.post.calls.mostRecent().args[0].API_Gateway;
      expect(url).toMatch(/article-suppliers\/$/);
    });
  });

  describe('update()', () => {
    it('calls PATCH /article-suppliers/:id with payload', async () => {
      fetchSpy.patch.and.returnValue(Promise.resolve(mockResponse(MOCK_ARTICLE_SUPPLIER)));
      await service.update('as-001', { lead_time_days: 14 });
      const args = fetchSpy.patch.calls.mostRecent().args[0];
      expect(args.API_Gateway).toContain('as-001');
      expect((args as any).values).toEqual({ lead_time_days: 14 });
    });
  });

  describe('softDelete()', () => {
    it('calls DELETE /article-suppliers/:id', async () => {
      fetchSpy.delete.and.returnValue(Promise.resolve(mockResponse(undefined)));
      await service.softDelete('as-001');
      expect(fetchSpy.delete).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('as-001') })
      );
    });
  });
});
