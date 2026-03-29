import { TestBed } from '@angular/core/testing';
import { AdjustmentReasonCodesService } from './adjustment-reason-codes.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';

describe('AdjustmentReasonCodesService', () => {
  let service: AdjustmentReasonCodesService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'post', 'put', 'delete']);

    TestBed.configureTestingModule({
      providers: [AdjustmentReasonCodesService, { provide: FetchService, useValue: fetchSpy }],
    });

    service = TestBed.inject(AdjustmentReasonCodesService);
  });

  describe('getList()', () => {
    it('calls GET /adjustment-reason-codes/', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.getList();
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('adjustment-reason-codes') })
      );
    });
  });

  describe('getListAdmin()', () => {
    it('calls GET /adjustment-reason-codes/admin', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.getListAdmin();
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('/admin') })
      );
    });
  });

  describe('getById()', () => {
    it('includes id in URL', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.getById('arc-001');
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('arc-001') })
      );
    });
  });

  describe('create()', () => {
    it('calls POST with data', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({} as any)));
      const data = { code: 'DAMAGE', description: 'Physical damage' } as any;
      await service.create(data);
      expect(fetchSpy.post).toHaveBeenCalledWith(jasmine.objectContaining({ values: data }));
    });
  });

  describe('update()', () => {
    it('calls PUT /:id with data', async () => {
      fetchSpy.put.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.update('arc-001', { description: 'Updated' } as any);
      const args = fetchSpy.put.calls.mostRecent().args[0];
      expect(args.API_Gateway).toContain('arc-001');
      expect((args as any).values).toEqual({ description: 'Updated' });
    });
  });

  describe('delete()', () => {
    it('calls DELETE /:id', async () => {
      fetchSpy.delete.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.delete('arc-del');
      expect(fetchSpy.delete).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('arc-del') })
      );
    });
  });
});
