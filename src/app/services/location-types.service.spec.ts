import { TestBed } from '@angular/core/testing';
import { LocationTypesService } from './location-types.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';

describe('LocationTypesService', () => {
  let service: LocationTypesService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'post', 'put', 'delete']);

    TestBed.configureTestingModule({
      providers: [LocationTypesService, { provide: FetchService, useValue: fetchSpy }],
    });

    service = TestBed.inject(LocationTypesService);
  });

  describe('getList()', () => {
    it('calls GET /location-types/', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.getList();
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('location-types') })
      );
    });
  });

  describe('getListAdmin()', () => {
    it('calls GET /location-types/admin', async () => {
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
      await service.getById('lt-001');
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('lt-001') })
      );
    });
  });

  describe('create()', () => {
    it('calls POST with data', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({} as any)));
      const data = { code: 'PALLET', name: 'Pallet' } as any;
      await service.create(data);
      expect(fetchSpy.post).toHaveBeenCalledWith(jasmine.objectContaining({ values: data }));
    });
  });

  describe('update()', () => {
    it('calls PUT /:id with data', async () => {
      fetchSpy.put.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.update('lt-001', { name: 'New Name' } as any);
      const args = fetchSpy.put.calls.mostRecent().args[0];
      expect(args.API_Gateway).toContain('lt-001');
      expect((args as any).values).toEqual({ name: 'New Name' });
    });
  });

  describe('delete()', () => {
    it('calls DELETE /:id', async () => {
      fetchSpy.delete.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.delete('lt-del');
      expect(fetchSpy.delete).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('lt-del') })
      );
    });
  });
});
