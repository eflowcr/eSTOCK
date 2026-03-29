import { TestBed } from '@angular/core/testing';
import { PresentationConversionsService } from './presentation-conversions.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';

describe('PresentationConversionsService', () => {
  let service: PresentationConversionsService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'post', 'put', 'delete']);

    TestBed.configureTestingModule({
      providers: [PresentationConversionsService, { provide: FetchService, useValue: fetchSpy }],
    });

    service = TestBed.inject(PresentationConversionsService);
  });

  describe('getList()', () => {
    it('calls GET /presentation-conversions/', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.getList();
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('presentation-conversions') })
      );
    });
  });

  describe('getListAdmin()', () => {
    it('calls GET /presentation-conversions/admin', async () => {
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
      await service.getById('pc-001');
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('pc-001') })
      );
    });
  });

  describe('create()', () => {
    it('calls POST with data', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({} as any)));
      const data = { from_type: 'BOX', to_type: 'UNIT', factor: 12 } as any;
      await service.create(data);
      expect(fetchSpy.post).toHaveBeenCalledWith(jasmine.objectContaining({ values: data }));
    });
  });

  describe('update()', () => {
    it('calls PUT /:id with data', async () => {
      fetchSpy.put.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.update('pc-001', { factor: 24 } as any);
      const args = fetchSpy.put.calls.mostRecent().args[0];
      expect(args.API_Gateway).toContain('pc-001');
    });
  });

  describe('delete()', () => {
    it('calls DELETE /:id', async () => {
      fetchSpy.delete.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.delete('pc-del');
      expect(fetchSpy.delete).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('pc-del') })
      );
    });
  });
});
