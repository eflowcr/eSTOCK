import { TestBed } from '@angular/core/testing';
import { InventoryService } from './inventory.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';

describe('InventoryService', () => {
  let service: InventoryService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'post', 'patch', 'delete']);

    TestBed.configureTestingModule({
      providers: [InventoryService, { provide: FetchService, useValue: fetchSpy }],
    });

    service = TestBed.inject(InventoryService);
  });

  // ─── getAll ───────────────────────────────────────────────────────────────

  describe('getAll()', () => {
    it('calls GET /inventory/', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.getAll();
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('/inventory') })
      );
    });
  });

  // ─── getPickSuggestions ───────────────────────────────────────────────────

  describe('getPickSuggestions()', () => {
    it('calls GET /inventory/pick-suggestions/:sku', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.getPickSuggestions('SKU-001');
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('pick-suggestions/SKU-001') })
      );
    });

    it('URL-encodes the SKU', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.getPickSuggestions('SKU/001');
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('SKU%2F001');
    });
  });

  // ─── getBySkuAndLocation ─────────────────────────────────────────────────

  describe('getBySkuAndLocation()', () => {
    it('returns the response on success', async () => {
      const resp = mockResponse({ id: 1 } as any);
      fetchSpy.get.and.returnValue(Promise.resolve(resp));
      const result = await service.getBySkuAndLocation('SKU-001', 'LOC-A');
      expect(result).toEqual(resp);
    });

    it('returns null when fetchService throws', async () => {
      fetchSpy.get.and.returnValue(Promise.reject(new Error('404')));
      const result = await service.getBySkuAndLocation('SKU-X', 'LOC-X');
      expect(result).toBeNull();
    });

    it('includes sku and location in the URL', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.getBySkuAndLocation('SKU-001', 'LOC-A1');
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('SKU-001');
      expect(url).toContain('LOC-A1');
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST /inventory/ with inventory data', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({})));
      const payload = { sku: 'SKU-001', location: 'LOC-A', quantity: 10 } as any;
      await service.create(payload);
      expect(fetchSpy.post).toHaveBeenCalledWith(
        jasmine.objectContaining({ values: payload })
      );
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PATCH /inventory/id/:id with data', async () => {
      fetchSpy.patch.and.returnValue(Promise.resolve(mockResponse({})));
      await service.update(42, { quantity: 20 } as any);
      const args = fetchSpy.patch.calls.mostRecent().args[0];
      expect(args.API_Gateway).toContain('42');
      expect((args as any).values).toEqual({ quantity: 20 });
    });
  });

  // ─── delete ───────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /inventory/id/:sku/:location', async () => {
      fetchSpy.delete.and.returnValue(Promise.resolve(mockResponse({})));
      await service.delete('SKU-001', 'LOC-A');
      const url: string = fetchSpy.delete.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('SKU-001');
      expect(url).toContain('LOC-A');
    });
  });
});
