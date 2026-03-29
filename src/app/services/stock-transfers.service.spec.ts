import { TestBed } from '@angular/core/testing';
import { StockTransfersService } from './stock-transfers.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';

describe('StockTransfersService', () => {
  let service: StockTransfersService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'post', 'put', 'delete']);

    TestBed.configureTestingModule({
      providers: [StockTransfersService, { provide: FetchService, useValue: fetchSpy }],
    });

    service = TestBed.inject(StockTransfersService);
  });

  // ─── getList ──────────────────────────────────────────────────────────────

  describe('getList()', () => {
    it('calls GET /stock-transfers/ without status', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.getList();
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('stock-transfers');
      expect(url).not.toContain('status=');
    });

    it('appends status when provided', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.getList('pending');
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('status=pending');
    });
  });

  // ─── getById ──────────────────────────────────────────────────────────────

  describe('getById()', () => {
    it('includes id in URL', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.getById('st-001');
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('st-001') })
      );
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('calls POST with data', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({} as any)));
      const data = { from_location: 'LOC-A', to_location: 'LOC-B' } as any;
      await service.create(data);
      expect(fetchSpy.post).toHaveBeenCalledWith(jasmine.objectContaining({ values: data }));
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('calls PUT /:id with data', async () => {
      fetchSpy.put.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.update('st-001', { status: 'completed' } as any);
      expect(fetchSpy.put).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('st-001') })
      );
    });
  });

  // ─── delete ───────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('calls DELETE /:id', async () => {
      fetchSpy.delete.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.delete('st-del');
      expect(fetchSpy.delete).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('st-del') })
      );
    });
  });

  // ─── execute ──────────────────────────────────────────────────────────────

  describe('execute()', () => {
    it('calls POST /:id/execute with empty body', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.execute('st-001');
      const args = fetchSpy.post.calls.mostRecent().args[0];
      expect(args.API_Gateway).toContain('st-001/execute');
      expect((args as any).values).toEqual({});
    });
  });

  // ─── lines ────────────────────────────────────────────────────────────────

  describe('getLines()', () => {
    it('calls GET /:transferId/lines', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.getLines('st-001');
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('st-001/lines') })
      );
    });
  });

  describe('createLine()', () => {
    it('calls POST /:transferId/lines with data', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({} as any)));
      const data = { sku: 'SKU-001', quantity: 5 } as any;
      await service.createLine('st-001', data);
      const args = fetchSpy.post.calls.mostRecent().args[0];
      expect(args.API_Gateway).toContain('st-001/lines');
      expect((args as any).values).toEqual(data);
    });
  });

  describe('updateLine()', () => {
    it('calls PUT /:transferId/lines/:lineId', async () => {
      fetchSpy.put.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.updateLine('st-001', 'line-001', { quantity: 10 } as any);
      const url: string = fetchSpy.put.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('st-001/lines/line-001');
    });
  });

  describe('deleteLine()', () => {
    it('calls DELETE /:transferId/lines/:lineId', async () => {
      fetchSpy.delete.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.deleteLine('st-001', 'line-001');
      const url: string = fetchSpy.delete.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('st-001/lines/line-001');
    });
  });
});
