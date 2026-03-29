import { TestBed } from '@angular/core/testing';
import { GamificationService } from './gamification.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';

const MOCK_STATS = {
  picking_tasks_completed: 10,
  receiving_tasks_completed: 5,
  pick_accuracy: 90,
} as any;

const MOCK_BADGE_PERFECT_PICKER = {
  criteria: { pickingTasks: 20, accuracy: 95 },
} as any;

describe('GamificationService', () => {
  let service: GamificationService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'post']);

    TestBed.configureTestingModule({
      providers: [GamificationService, { provide: FetchService, useValue: fetchSpy }],
    });

    service = TestBed.inject(GamificationService);
  });

  // ─── HTTP methods ─────────────────────────────────────────────────────────

  describe('getStats()', () => {
    it('calls GET /gamification/stats', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse({} as any)));
      await service.getStats();
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('/stats') })
      );
    });
  });

  describe('getBadges()', () => {
    it('calls GET /gamification/badges', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.getBadges();
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('/badges') })
      );
    });
  });

  describe('getAllBadges()', () => {
    it('calls GET /gamification/all-badges', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.getAllBadges();
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('/all-badges') })
      );
    });
  });

  describe('completeTasks()', () => {
    it('calls POST /gamification/complete-tasks with data', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse([])));
      const data = { task_id: 'task-001', task_type: 'picking' } as any;
      await service.completeTasks(data);
      expect(fetchSpy.post).toHaveBeenCalledWith(
        jasmine.objectContaining({
          API_Gateway: jasmine.stringContaining('/complete-tasks'),
          values: data,
        })
      );
    });
  });

  describe('getOperatorStats()', () => {
    it('calls GET /gamification/operator-stats', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.getOperatorStats();
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('/operator-stats') })
      );
    });
  });

  // ─── getBadgeProgress (pure logic) ───────────────────────────────────────

  describe('getBadgeProgress()', () => {
    it('returns 0 for unknown badge type', () => {
      expect(service.getBadgeProgress('unknown_type', MOCK_STATS, MOCK_BADGE_PERFECT_PICKER)).toBe(0);
    });

    it('perfect_picker: caps at 100 when stats exceed criteria', () => {
      const superStats = { picking_tasks_completed: 100, pick_accuracy: 100 } as any;
      const badge = { criteria: { pickingTasks: 10, accuracy: 95 } } as any;
      expect(service.getBadgeProgress('perfect_picker', superStats, badge)).toBe(100);
    });

    it('perfect_picker: returns min of task and accuracy progress', () => {
      // tasks: 10/20 = 50%, accuracy: 90/95 ≈ 94.7% → min = 50%
      const progress = service.getBadgeProgress('perfect_picker', MOCK_STATS, MOCK_BADGE_PERFECT_PICKER);
      expect(progress).toBeCloseTo(50, 0);
    });

    it('quick_receiver: based on receiving tasks', () => {
      const badge = { criteria: { receivingTasks: 10 } } as any;
      // 5/10 = 50%
      expect(service.getBadgeProgress('quick_receiver', MOCK_STATS, badge)).toBeCloseTo(50, 0);
    });

    it('speed_demon: based on picking tasks', () => {
      const badge = { criteria: { pickingTasks: 20 } } as any;
      // 10/20 = 50%
      expect(service.getBadgeProgress('speed_demon', MOCK_STATS, badge)).toBeCloseTo(50, 0);
    });

    it('accuracy_master: returns min of totalTasks and accuracy progress', () => {
      const badge = { criteria: { totalTasks: 30, accuracy: 95 } } as any;
      // total: 15/30 = 50%, accuracy: 90/95 ≈ 94.7% → min ≈ 50%
      const progress = service.getBadgeProgress('accuracy_master', MOCK_STATS, badge);
      expect(progress).toBeCloseTo(50, 0);
    });

    it('task_champion: based on total tasks', () => {
      const badge = { criteria: { totalTasks: 30 } } as any;
      // 15/30 = 50%
      expect(service.getBadgeProgress('task_champion', MOCK_STATS, badge)).toBeCloseTo(50, 0);
    });

    it('returns 0 when criteria fields are missing', () => {
      const badgeMissingCriteria = { criteria: {} } as any;
      expect(service.getBadgeProgress('perfect_picker', MOCK_STATS, badgeMissingCriteria)).toBe(0);
    });
  });
});
