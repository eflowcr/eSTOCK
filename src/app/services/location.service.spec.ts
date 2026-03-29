import { TestBed } from '@angular/core/testing';
import { LocationService } from './location.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';

describe('LocationService', () => {
  let service: LocationService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'post', 'put', 'delete', 'download']);

    TestBed.configureTestingModule({
      providers: [LocationService, { provide: FetchService, useValue: fetchSpy }],
    });

    service = TestBed.inject(LocationService);
  });

  describe('getAll()', () => {
    it('calls GET /locations/', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.getAll();
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('/locations') })
      );
    });
  });

  describe('getById()', () => {
    it('includes id in URL', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.getById('loc-001');
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('loc-001') })
      );
    });
  });

  describe('create()', () => {
    it('calls POST /locations/ with data', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({})));
      const loc = { code: 'A-01', name: 'Rack A1' } as any;
      await service.create(loc);
      expect(fetchSpy.post).toHaveBeenCalledWith(jasmine.objectContaining({ values: loc }));
    });
  });

  describe('update()', () => {
    it('calls PUT /locations/:id with data', async () => {
      fetchSpy.put.and.returnValue(Promise.resolve(mockResponse({})));
      await service.update('loc-001', { name: 'Rack A2' } as any);
      const args = fetchSpy.put.calls.mostRecent().args[0];
      expect(args.API_Gateway).toContain('loc-001');
      expect((args as any).values).toEqual({ name: 'Rack A2' });
    });
  });

  describe('delete()', () => {
    it('calls DELETE /locations/:id', async () => {
      fetchSpy.delete.and.returnValue(Promise.resolve(mockResponse({})));
      await service.delete('loc-del');
      expect(fetchSpy.delete).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('loc-del') })
      );
    });
  });

  describe('importFile()', () => {
    it('calls POST /locations/import/ with FormData', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({})));
      const file = new File(['data'], 'locations.xlsx');
      await service.importFile(file);
      const args = fetchSpy.post.calls.mostRecent().args[0];
      expect(args.API_Gateway).toContain('/import');
      expect((args as any).values instanceof FormData).toBeTrue();
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

    it('respects custom format', async () => {
      fetchSpy.download.and.returnValue(Promise.resolve(new Blob()));
      await service.exportFile('csv');
      expect(fetchSpy.download).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('format=csv') })
      );
    });
  });
});
