import { TestBed } from '@angular/core/testing';
import { InventoryValuationService } from './inventory-valuation.service';
import { FetchService } from './extras/fetch.service';
import { InventoryValuation } from '@app/models/inventory-valuation.model';

function mockValuation(groupBy = 'article'): InventoryValuation {
  return {
    total_value: 5000,
    breakdown: [
      { id: '1', label: 'SKU-001', total_value: 3000, quantity: 10 },
      { id: '2', label: 'SKU-002', total_value: 2000, quantity: 5 },
    ],
    group_by: groupBy as any,
  };
}

function mockResponse(data: any) {
  return Promise.resolve({ result: { success: true, message: 'ok' }, data }) as any;
}

describe('InventoryValuationService', () => {
  let service: InventoryValuationService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'post', 'patch', 'delete']);
    TestBed.configureTestingModule({
      providers: [
        InventoryValuationService,
        { provide: FetchService, useValue: fetchSpy },
      ],
    });
    service = TestBed.inject(InventoryValuationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch valuation by article groupBy', async () => {
    const data = mockValuation('article');
    fetchSpy.get.and.returnValue(mockResponse(data));

    const response = await service.get('article');

    expect(fetchSpy.get).toHaveBeenCalledTimes(1);
    expect(response.result.success).toBeTrue();
    expect(response.data?.total_value).toBe(5000);
  });

  it('should use cached result within TTL', async () => {
    const data = mockValuation('article');
    fetchSpy.get.and.returnValue(mockResponse(data));

    await service.get('article');
    await service.get('article');

    expect(fetchSpy.get).toHaveBeenCalledTimes(1);
  });

  it('should cache separately per groupBy', async () => {
    fetchSpy.get.and.callFake((opts: any) => {
      const gb = opts.API_Gateway.includes('location') ? 'location' : 'article';
      return mockResponse(mockValuation(gb));
    });

    await service.get('article');
    await service.get('location');

    expect(fetchSpy.get).toHaveBeenCalledTimes(2);
  });

  it('should invalidate cache on invalidateCache()', async () => {
    const data = mockValuation('category');
    fetchSpy.get.and.returnValue(mockResponse(data));

    await service.get('category');
    service.invalidateCache();
    await service.get('category');

    expect(fetchSpy.get).toHaveBeenCalledTimes(2);
  });
});
