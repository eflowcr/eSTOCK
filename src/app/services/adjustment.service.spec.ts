import { TestBed } from '@angular/core/testing';
import { AdjustmentService } from './adjustment.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';

describe('AdjustmentService', () => {
  let service: AdjustmentService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'post', 'download']);

    TestBed.configureTestingModule({
      providers: [AdjustmentService, { provide: FetchService, useValue: fetchSpy }],
    });

    service = TestBed.inject(AdjustmentService);
  });

  describe('getAll()', () => {
    it('calls GET /adjustments/', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.getAll();
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('/adjustments') })
      );
    });
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

  describe('getDetails()', () => {
    it('calls GET /adjustments/:id/details', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.getDetails(10);
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('10/details') })
      );
    });
  });

  describe('create()', () => {
    it('calls POST /adjustments/ with data', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({})));
      const data = { sku: 'SKU-001', quantity: 5, reason_code: 'DAMAGE' } as any;
      await service.create(data);
      expect(fetchSpy.post).toHaveBeenCalledWith(jasmine.objectContaining({ values: data }));
    });
  });

  describe('exportFile()', () => {
    it('calls download with xlsx by default', async () => {
      fetchSpy.download.and.returnValue(Promise.resolve(new Blob()));
      await service.exportFile();
      expect(fetchSpy.download).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('format=xlsx') })
      );
    });

    it('passes custom format', async () => {
      fetchSpy.download.and.returnValue(Promise.resolve(new Blob()));
      await service.exportFile('csv');
      expect(fetchSpy.download).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('format=csv') })
      );
    });
  });
});
