import { TestBed } from '@angular/core/testing';
import { SerialService } from './serial.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';

describe('SerialService', () => {
  let service: SerialService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'post', 'put', 'delete']);

    TestBed.configureTestingModule({
      providers: [SerialService, { provide: FetchService, useValue: fetchSpy }],
    });

    service = TestBed.inject(SerialService);
  });

  describe('getById()', () => {
    it('includes id in URL', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.getById(5);
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('5') })
      );
    });
  });

  describe('getBySku()', () => {
    it('calls GET /serials/by-sku/:sku', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.getBySku('SKU-001');
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('by-sku/SKU-001') })
      );
    });
  });

  describe('create()', () => {
    it('calls POST /serials/ with serial data', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({})));
      const serial = { sku: 'SKU-001', serial_number: 'SN-001' } as any;
      await service.create(serial);
      expect(fetchSpy.post).toHaveBeenCalledWith(jasmine.objectContaining({ values: serial }));
    });
  });

  describe('update()', () => {
    it('calls PUT /serials/:id', async () => {
      fetchSpy.put.and.returnValue(Promise.resolve(mockResponse({})));
      await service.update(3, { status: 'available' } as any);
      expect(fetchSpy.put).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('3') })
      );
    });
  });

  describe('delete()', () => {
    it('calls DELETE /serials/:id', async () => {
      fetchSpy.delete.and.returnValue(Promise.resolve(mockResponse({})));
      await service.delete(3);
      expect(fetchSpy.delete).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('3') })
      );
    });
  });

  describe('search()', () => {
    it('appends defined params', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.search({ sku: 'SKU-002', status: 'available' });
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('sku=SKU-002');
      expect(url).toContain('status=available');
    });

    it('omits empty params and no ?', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.search({});
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).not.toContain('?');
    });
  });
});
