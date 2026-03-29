import { TestBed } from '@angular/core/testing';
import { ArticleService } from './article.service';
import { FetchService } from './extras/fetch.service';
import {
  MOCK_ARTICLE,
  MOCK_ARTICLES,
  mockResponse,
} from '../../__tests__/mocks/data';
import { CreateArticleRequest, UpdateArticleRequest } from '@app/models/article.model';

describe('ArticleService', () => {
  let service: ArticleService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', [
      'get',
      'post',
      'put',
      'delete',
      'upload',
      'download',
    ]);

    TestBed.configureTestingModule({
      providers: [
        ArticleService,
        { provide: FetchService, useValue: fetchSpy },
      ],
    });

    service = TestBed.inject(ArticleService);
  });

  // ─── getAll ────────────────────────────────────────────────────────────────

  describe('getAll()', () => {
    it('returns the list of articles', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(MOCK_ARTICLES)));

      const result = await service.getAll();

      expect(result.result.success).toBe(true);
      expect(result.data).toEqual(MOCK_ARTICLES);
      expect(fetchSpy.get).toHaveBeenCalledTimes(1);
    });

    it('calls the /articles/ endpoint', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));

      await service.getAll();

      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('/articles') })
      );
    });
  });

  // ─── getById ──────────────────────────────────────────────────────────────

  describe('getById()', () => {
    it('returns a single article', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(MOCK_ARTICLE)));

      const result = await service.getById(1);

      expect(result.data).toEqual(MOCK_ARTICLE);
    });

    it('includes the id in the endpoint URL', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(MOCK_ARTICLE)));

      await service.getById(42);

      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('/42') })
      );
    });
  });

  // ─── getBySku ─────────────────────────────────────────────────────────────

  describe('getBySku()', () => {
    it('includes the SKU in the endpoint URL', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(MOCK_ARTICLE)));

      await service.getBySku('SKU-001');

      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('SKU-001') })
      );
    });

    it('URL-encodes special characters in SKU', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(MOCK_ARTICLE)));

      await service.getBySku('SKU A&B');

      const call = fetchSpy.get.calls.mostRecent().args[0];
      expect(call.API_Gateway).not.toContain('SKU A&B');
      expect(call.API_Gateway).toContain(encodeURIComponent('SKU A&B'));
    });
  });

  // ─── checkSkuAvailability ─────────────────────────────────────────────────

  describe('checkSkuAvailability()', () => {
    it('returns "available" immediately for an empty string without making a request', async () => {
      const result = await service.checkSkuAvailability('');

      expect(result).toBe('available');
      expect(fetchSpy.get).not.toHaveBeenCalled();
    });

    it('returns "available" for whitespace-only input', async () => {
      const result = await service.checkSkuAvailability('   ');

      expect(result).toBe('available');
      expect(fetchSpy.get).not.toHaveBeenCalled();
    });

    it('returns "in_use" when the backend finds the article', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(MOCK_ARTICLE)));

      const result = await service.checkSkuAvailability('SKU-001');

      expect(result).toBe('in_use');
    });

    it('returns "available" when backend returns 404', async () => {
      fetchSpy.get.and.returnValue(Promise.reject({ status: 404 }));

      const result = await service.checkSkuAvailability('SKU-MISSING');

      expect(result).toBe('available');
    });

    it('returns "error" on any non-404 failure', async () => {
      fetchSpy.get.and.returnValue(Promise.reject({ status: 500 }));

      const result = await service.checkSkuAvailability('SKU-001');

      expect(result).toBe('error');
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('sends article data in POST body', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({})));
      const payload: CreateArticleRequest = {
        sku: 'NEW-001',
        name: 'New Article',
        presentation: 'Unidad',
        track_by_lot: false,
        track_by_serial: false,
        track_expiration: false,
      };

      await service.create(payload);

      expect(fetchSpy.post).toHaveBeenCalledWith(
        jasmine.objectContaining({ values: payload })
      );
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('includes the article id in the PUT URL', async () => {
      fetchSpy.put.and.returnValue(Promise.resolve(mockResponse({})));
      const patch: UpdateArticleRequest = { name: 'Renamed' };

      await service.update(99, patch);

      expect(fetchSpy.put).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('/99') })
      );
    });

    it('sends the updated fields in the PUT body', async () => {
      fetchSpy.put.and.returnValue(Promise.resolve(mockResponse({})));
      const patch: UpdateArticleRequest = { is_active: false };

      await service.update(1, patch);

      expect(fetchSpy.put).toHaveBeenCalledWith(
        jasmine.objectContaining({ values: patch })
      );
    });
  });

  // ─── delete ───────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE with the correct article id in URL', async () => {
      fetchSpy.delete.and.returnValue(Promise.resolve(mockResponse({})));

      await service.delete(7);

      expect(fetchSpy.delete).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('/7') })
      );
    });

    it('accepts a string id', async () => {
      fetchSpy.delete.and.returnValue(Promise.resolve(mockResponse({})));

      await service.delete('article-uuid-abc');

      expect(fetchSpy.delete).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('article-uuid-abc') })
      );
    });
  });

  // ─── search ───────────────────────────────────────────────────────────────

  describe('search()', () => {
    it('appends defined params as query string', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));

      await service.search({ sku: 'SKU-001', is_active: true });

      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('sku=SKU-001');
      expect(url).toContain('is_active=true');
    });

    it('omits undefined and empty string params from query string', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));

      await service.search({ sku: '', is_active: undefined });

      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).not.toContain('sku=');
      expect(url).not.toContain('is_active=');
    });

    it('calls base /articles/ URL when params are all empty', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));

      await service.search({});

      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).not.toContain('?');
    });

    it('supports multiple search params at once', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));

      await service.search({ search: 'widget', track_by_lot: true, page: 2, limit: 20 });

      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('search=widget');
      expect(url).toContain('track_by_lot=true');
      expect(url).toContain('page=2');
      expect(url).toContain('limit=20');
    });
  });

  // ─── exportFile ───────────────────────────────────────────────────────────

  describe('exportFile()', () => {
    it('defaults to xlsx format', async () => {
      fetchSpy.download.and.returnValue(Promise.resolve(new Blob()));

      await service.exportFile();

      expect(fetchSpy.download).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('format=xlsx') })
      );
    });

    it('passes the requested format in the URL', async () => {
      fetchSpy.download.and.returnValue(Promise.resolve(new Blob()));

      await service.exportFile('csv');

      expect(fetchSpy.download).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('format=csv') })
      );
    });

    it('returns a Blob', async () => {
      const blob = new Blob(['col1,col2'], { type: 'text/csv' });
      fetchSpy.download.and.returnValue(Promise.resolve(blob));

      const result = await service.exportFile('csv');

      expect(result).toBe(blob);
    });
  });
});
