import { TestBed } from '@angular/core/testing';
import { RolesService } from './roles.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';

describe('RolesService', () => {
  let service: RolesService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'put']);

    TestBed.configureTestingModule({
      providers: [RolesService, { provide: FetchService, useValue: fetchSpy }],
    });

    service = TestBed.inject(RolesService);
  });

  describe('getList()', () => {
    it('calls GET /roles/', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.getList();
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('/roles') })
      );
    });
  });

  describe('getById()', () => {
    it('calls GET /roles/:id with encoded id', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.getById('Admin');
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('Admin') })
      );
    });
  });

  describe('updatePermissions()', () => {
    it('calls PUT /roles/:id with permissions wrapped in object', async () => {
      fetchSpy.put.and.returnValue(Promise.resolve(mockResponse({} as any)));
      const perms = { inventory: { read: true } };
      await service.updatePermissions('Operator', perms);
      const args = fetchSpy.put.calls.mostRecent().args[0];
      expect(args.API_Gateway).toContain('Operator');
      expect((args as any).values).toEqual({ permissions: perms });
    });
  });
});
