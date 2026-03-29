import { TestBed } from '@angular/core/testing';
import { DashboardService } from './dashboard.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';
import { DashboardStats } from '@app/models/dashboard.model';

const MOCK_STATS: DashboardStats = {
  totalSkus: 120,
  inventoryValue: 50000,
  lowStockCount: 3,
  tasksChangePercent: 10,
  movChangePercent: -5,
  tasksThisWeek: [
    { day: 'Mon', count: 2 },
    { day: 'Tue', count: 5 },
  ],
  movementLast7Days: [
    { date: '2025-01-01', inbound: 10, outbound: 5 },
  ],
} as any;

describe('DashboardService', () => {
  let service: DashboardService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get']);

    TestBed.configureTestingModule({
      providers: [DashboardService, { provide: FetchService, useValue: fetchSpy }],
    });

    service = TestBed.inject(DashboardService);
  });

  // ─── getStats ─────────────────────────────────────────────────────────────

  describe('getStats()', () => {
    it('calls GET /dashboard/stats with defaults', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(MOCK_STATS)));
      await service.getStats();
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('/dashboard/stats');
      expect(url).toContain('tasksPeriod=weekly');
      expect(url).toContain('lowStockThreshold=20');
    });

    it('respects custom params', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(MOCK_STATS)));
      await service.getStats('monthly', 10);
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('tasksPeriod=monthly');
      expect(url).toContain('lowStockThreshold=10');
    });
  });

  // ─── buildKpis ────────────────────────────────────────────────────────────

  describe('buildKpis()', () => {
    it('returns 3 placeholder KPIs when stats is null', () => {
      const kpis = service.buildKpis(null);
      expect(kpis.length).toBe(3);
      kpis.forEach((k) => expect(k.value).toBe('—'));
    });

    it('returns 3 KPIs with real data when stats provided', () => {
      const kpis = service.buildKpis(MOCK_STATS);
      expect(kpis.length).toBe(3);
      expect(kpis[0].value).toBe('120');
      expect(kpis[1].value).toContain('50,000');
      expect(kpis[2].value).toBe('3');
    });

    it('uses movChangePercent for total_skus and inventory_value', () => {
      const kpis = service.buildKpis(MOCK_STATS);
      expect(kpis[0].changePercent).toBe(-5);
      expect(kpis[1].changePercent).toBe(-5);
    });

    it('uses tasksChangePercent for low_stock_count', () => {
      const kpis = service.buildKpis(MOCK_STATS);
      expect(kpis[2].changePercent).toBe(10);
    });
  });

  // ─── getTasksByDay ────────────────────────────────────────────────────────

  describe('getTasksByDay()', () => {
    it('returns stats.tasksThisWeek when available', () => {
      const result = service.getTasksByDay(MOCK_STATS);
      expect(result).toEqual(MOCK_STATS.tasksThisWeek);
    });

    it('returns 7 zero-count days when stats is null', () => {
      const result = service.getTasksByDay(null);
      expect(result.length).toBe(7);
      result.forEach((d) => expect(d.count).toBe(0));
    });

    it('returns 7 zero-count days when tasksThisWeek is empty', () => {
      const result = service.getTasksByDay({ ...MOCK_STATS, tasksThisWeek: [] } as any);
      expect(result.length).toBe(7);
    });
  });

  // ─── getMovementChartData ─────────────────────────────────────────────────

  describe('getMovementChartData()', () => {
    it('returns stats.movementLast7Days when available', () => {
      const result = service.getMovementChartData(MOCK_STATS);
      expect(result).toEqual(MOCK_STATS.movementLast7Days);
    });

    it('returns 7 entries with zero values when stats is null', () => {
      const result = service.getMovementChartData(null);
      expect(result.length).toBe(7);
      result.forEach((d) => {
        expect(d.inbound).toBe(0);
        expect(d.outbound).toBe(0);
      });
    });

    it('entries have valid date strings', () => {
      const result = service.getMovementChartData(null);
      result.forEach((d) => expect(d.date).toMatch(/^\d{4}-\d{2}-\d{2}$/));
    });
  });

  // ─── getStackedBarData ────────────────────────────────────────────────────

  describe('getStackedBarData()', () => {
    it('returns empty array when response has no months', async () => {
      fetchSpy.get.and.returnValue(
        Promise.resolve(mockResponse({ months: [] }))
      );
      const result = await service.getStackedBarData();
      expect(result).toEqual([]);
    });

    it('maps months to StackedBarPoint array', async () => {
      fetchSpy.get.and.returnValue(
        Promise.resolve(
          mockResponse({
            months: [{ period: 'Jan', total: 30, inbound: 10, outbound: 15, adjusted: 5 }],
          })
        )
      );
      const result = await service.getStackedBarData();
      expect(result.length).toBe(1);
      expect(result[0].period).toBe('Jan');
      expect(result[0].segments.length).toBe(3);
    });
  });

  // ─── getRecentActivity ────────────────────────────────────────────────────

  describe('getRecentActivity()', () => {
    it('returns empty array when response has no activities', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse({ activities: [] })));
      const result = await service.getRecentActivity();
      expect(result).toEqual([]);
    });

    it('maps activities correctly', async () => {
      fetchSpy.get.and.returnValue(
        Promise.resolve(
          mockResponse({
            activities: [{ id: '1', type: 'create', message: 'Item added', user: 'admin', time: '5m ago' }],
          })
        )
      );
      const result = await service.getRecentActivity();
      expect(result[0].id).toBe('1');
      expect(result[0].message).toBe('Item added');
    });
  });
});
