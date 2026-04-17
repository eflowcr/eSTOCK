import { TestBed } from '@angular/core/testing';
import { CategoriesService } from './categories.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'post', 'patch', 'delete']);
    TestBed.configureTestingModule({
      providers: [CategoriesService, { provide: FetchService, useValue: fetchSpy }],
    });
    service = TestBed.inject(CategoriesService);
  });

  describe('list()', () => {
    it('calls GET /categories', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.list();
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('/categories') })
      );
    });
  });

  describe('tree()', () => {
    it('calls GET /categories/tree', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.tree();
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('/categories/tree');
    });
  });

  describe('getById()', () => {
    it('includes id in URL', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.getById('cat-001');
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('cat-001') })
      );
    });
  });

  describe('create()', () => {
    it('calls POST /categories with payload', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({} as any)));
      const payload = { name: 'Electronics', is_active: true };
      await service.create(payload);
      expect(fetchSpy.post).toHaveBeenCalledWith(jasmine.objectContaining({ values: payload }));
    });
  });

  describe('update()', () => {
    it('calls PATCH /categories/:id', async () => {
      fetchSpy.patch.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.update('cat-001', { name: 'Updated' });
      const args = fetchSpy.patch.calls.mostRecent().args[0];
      expect(args.API_Gateway).toContain('cat-001');
    });
  });

  describe('softDelete()', () => {
    it('calls DELETE /categories/:id', async () => {
      fetchSpy.delete.and.returnValue(Promise.resolve(mockResponse(undefined)));
      await service.softDelete('cat-001');
      expect(fetchSpy.delete).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('cat-001') })
      );
    });
  });
});
