import { TestBed } from '@angular/core/testing';
import { LotService } from './lot.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';

describe('LotService', () => {
  let service: LotService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'post', 'put', 'delete']);

    TestBed.configureTestingModule({
      providers: [LotService, { provide: FetchService, useValue: fetchSpy }],
    });

    service = TestBed.inject(LotService);
  });

  describe('getAll()', () => {
    it('calls GET /lots/', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.getAll();
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('/lots') })
      );
    });
  });

  describe('getBySku()', () => {
    it('includes the SKU in the URL', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.getBySku('SKU-001');
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('SKU-001') })
      );
    });
  });

  describe('create()', () => {
    it('calls POST /lots/ with lot data', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({})));
      const lot = { sku: 'SKU-001', lot_number: 'LOT-01', quantity: 50 } as any;
      await service.create(lot);
      expect(fetchSpy.post).toHaveBeenCalledWith(jasmine.objectContaining({ values: lot }));
    });
  });

  describe('update()', () => {
    it('calls PUT /lots/:id with data', async () => {
      fetchSpy.put.and.returnValue(Promise.resolve(mockResponse({})));
      await service.update(7, { quantity: 30 } as any);
      const args = fetchSpy.put.calls.mostRecent().args[0];
      expect(args.API_Gateway).toContain('7');
      expect((args as any).values).toEqual({ quantity: 30 });
    });
  });

  describe('delete()', () => {
    it('calls DELETE /lots/:id', async () => {
      fetchSpy.delete.and.returnValue(Promise.resolve(mockResponse({})));
      await service.delete(7);
      expect(fetchSpy.delete).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('7') })
      );
    });
  });

  describe('search()', () => {
    it('appends defined params as query string', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.search({ sku: 'SKU-001', lot_number: 'LOT-01' });
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('sku=SKU-001');
      expect(url).toContain('lot_number=LOT-01');
    });

    it('omits undefined and empty-string params', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.search({ sku: undefined as any, lot_number: '' });
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).not.toContain('sku=');
      expect(url).not.toContain('lot_number=');
      expect(url).not.toContain('?');
    });
  });
});
