import { TestBed } from '@angular/core/testing';
import { StockSettingsService } from './stock-settings.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';

describe('StockSettingsService', () => {
  let service: StockSettingsService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'patch']);
    TestBed.configureTestingModule({
      providers: [StockSettingsService, { provide: FetchService, useValue: fetchSpy }],
    });
    service = TestBed.inject(StockSettingsService);
  });

  describe('get()', () => {
    it('calls GET /settings/stock', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.get();
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('/settings/stock') })
      );
    });
  });

  describe('update()', () => {
    it('calls PATCH /settings/stock with partial payload', async () => {
      fetchSpy.patch.and.returnValue(Promise.resolve(mockResponse({} as any)));
      const payload = { valuation_method: 'fifo' as const };
      await service.update(payload);
      expect(fetchSpy.patch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          API_Gateway: jasmine.stringContaining('/settings/stock'),
          values: payload,
        })
      );
    });
  });
});
