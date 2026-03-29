import { TestBed } from '@angular/core/testing';
import { PresentationTypesService } from './presentation-types.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';

describe('PresentationTypesService', () => {
  let service: PresentationTypesService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'post', 'put', 'delete']);

    TestBed.configureTestingModule({
      providers: [PresentationTypesService, { provide: FetchService, useValue: fetchSpy }],
    });

    service = TestBed.inject(PresentationTypesService);
  });

  describe('getList()', () => {
    it('calls GET /presentation-types/', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.getList();
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('presentation-types') })
      );
    });
  });

  describe('getListAdmin()', () => {
    it('calls GET /presentation-types/admin', async () => {
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
      await service.getById('pt-001');
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('pt-001') })
      );
    });
  });

  describe('create()', () => {
    it('calls POST with data', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({} as any)));
      const data = { code: 'BOX', name: 'Box' } as any;
      await service.create(data);
      expect(fetchSpy.post).toHaveBeenCalledWith(jasmine.objectContaining({ values: data }));
    });
  });

  describe('update()', () => {
    it('calls PUT /:id with data', async () => {
      fetchSpy.put.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.update('pt-001', { name: 'Updated' } as any);
      expect(fetchSpy.put).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('pt-001') })
      );
    });
  });

  describe('delete()', () => {
    it('calls DELETE /:id', async () => {
      fetchSpy.delete.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.delete('pt-del');
      expect(fetchSpy.delete).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('pt-del') })
      );
    });
  });
});
