import { TestBed } from '@angular/core/testing';
import { StockAlertService } from './stock-alert.service';
import { FetchService } from './extras/fetch.service';
import {
  MOCK_DASHBOARD_ALERTS,
  MOCK_ALERT_RESPONSE,
  mockResponse,
} from '../../__tests__/mocks/data';

describe('StockAlertService', () => {
  let service: StockAlertService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', [
      'get',
      'patch',
      'download',
    ]);

    TestBed.configureTestingModule({
      providers: [
        StockAlertService,
        { provide: FetchService, useValue: fetchSpy },
      ],
    });

    service = TestBed.inject(StockAlertService);
  });

  // ─── getAll ────────────────────────────────────────────────────────────────

  describe('getAll()', () => {
    it('fetches active (unresolved) alerts with resolved=false', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(MOCK_DASHBOARD_ALERTS)));

      const result = await service.getAll(false);

      expect(result.data).toEqual(MOCK_DASHBOARD_ALERTS);
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('false') })
      );
    });

    it('fetches resolved alerts with resolved=true', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));

      await service.getAll(true);

      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('true') })
      );
    });
  });

  // ─── analyze ──────────────────────────────────────────────────────────────

  describe('analyze()', () => {
    it('calls the /analyze endpoint', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(MOCK_ALERT_RESPONSE)));

      const result = await service.analyze();

      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('/analyze') })
      );
      expect(result.data).toEqual(MOCK_ALERT_RESPONSE);
    });

    it('returns summary with correct counts', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(MOCK_ALERT_RESPONSE)));

      const result = await service.analyze();

      expect(result.data.summary.total).toBe(2);
      expect(result.data.summary.critical).toBe(1);
      expect(result.data.summary.high).toBe(1);
    });
  });

  // ─── getLotExpirations ────────────────────────────────────────────────────

  describe('getLotExpirations()', () => {
    it('calls the /lot-expiration endpoint', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));

      await service.getLotExpirations();

      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('/lot-expiration') })
      );
    });
  });

  // ─── resolve ──────────────────────────────────────────────────────────────

  describe('resolve()', () => {
    it('sends a PATCH to /{id}/resolve', async () => {
      fetchSpy.patch.and.returnValue(Promise.resolve(mockResponse({})));

      await service.resolve('alert-uuid-001');

      expect(fetchSpy.patch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          API_Gateway: jasmine.stringContaining('alert-uuid-001/resolve'),
        })
      );
    });

    it('sends an empty body in the PATCH', async () => {
      fetchSpy.patch.and.returnValue(Promise.resolve(mockResponse({})));

      await service.resolve('some-id');

      expect(fetchSpy.patch).toHaveBeenCalledWith(
        jasmine.objectContaining({ values: {} })
      );
    });
  });

  // ─── export ───────────────────────────────────────────────────────────────

  describe('export()', () => {
    it('calls download (not get) to receive a Blob', async () => {
      const blob = new Blob(['binary-xlsx'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      fetchSpy.download.and.returnValue(Promise.resolve(blob));

      const result = await service.export();

      expect(fetchSpy.download).toHaveBeenCalled();
      expect(fetchSpy.get).not.toHaveBeenCalled();
      expect(result).toBe(blob);
    });

    it('calls the /export endpoint', async () => {
      fetchSpy.download.and.returnValue(Promise.resolve(new Blob()));

      await service.export();

      expect(fetchSpy.download).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('/export') })
      );
    });
  });

  // ─── search ───────────────────────────────────────────────────────────────

  describe('search()', () => {
    it('appends defined params as query string', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));

      await service.search({ sku: 'SKU-001', alert_level: 'critical' });

      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('sku=SKU-001');
      expect(url).toContain('alert_level=critical');
    });

    it('omits undefined and null params from query string', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));

      await service.search({ sku: undefined, alert_level: undefined });

      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).not.toContain('sku=');
      expect(url).not.toContain('alert_level=');
    });

    it('omits empty-string params', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));

      await service.search({ search: '' });

      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).not.toContain('search=');
    });

    it('calls base URL when all params are empty', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));

      await service.search({});

      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).not.toContain('?');
    });

    it('supports is_resolved filter', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));

      await service.search({ is_resolved: true });

      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('is_resolved=true');
    });
  });
});
