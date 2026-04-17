import { TestBed } from '@angular/core/testing';
import { InventoryValuationService } from './inventory-valuation.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';

describe('InventoryValuationService', () => {
  let service: InventoryValuationService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get']);
    TestBed.configureTestingModule({
      providers: [InventoryValuationService, { provide: FetchService, useValue: fetchSpy }],
    });
    service = TestBed.inject(InventoryValuationService);
  });

  describe('get()', () => {
    it('calls GET /inventory/valuation with group_by=article', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.get('article');
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('/inventory/valuation');
      expect(url).toContain('group_by=article');
    });

    it('passes active_only=false when specified', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.get('location', false);
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('active_only=false');
    });

    it('defaults active_only to true', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.get('category');
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('active_only=true');
    });
  });
});
