import { TestBed } from '@angular/core/testing';
import { NotificationsService } from './notifications.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'patch', 'post']);
    TestBed.configureTestingModule({
      providers: [NotificationsService, { provide: FetchService, useValue: fetchSpy }],
    });
    service = TestBed.inject(NotificationsService);
  });

  afterEach(() => {
    service.stopPolling();
  });

  describe('list()', () => {
    it('calls GET /notifications without query when no filters', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.list();
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('/notifications');
      expect(url).not.toContain('?');
    });

    it('appends unread=true filter', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.list({ unread: true });
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('unread=true');
    });
  });

  describe('countUnread()', () => {
    it('calls GET /notifications/count and returns count', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse({ count: 5 })));
      const count = await service.countUnread();
      expect(count).toBe(5);
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('/notifications/count') })
      );
    });
  });

  describe('markRead()', () => {
    it('calls PATCH /notifications/:id/read', async () => {
      fetchSpy.patch.and.returnValue(Promise.resolve(mockResponse(undefined)));
      await service.markRead('notif-001');
      const args = fetchSpy.patch.calls.mostRecent().args[0];
      expect(args.API_Gateway).toContain('notif-001/read');
    });
  });

  describe('markAllRead()', () => {
    it('calls PATCH /notifications/mark-all-read', async () => {
      fetchSpy.patch.and.returnValue(Promise.resolve(mockResponse(undefined)));
      await service.markAllRead();
      const url: string = fetchSpy.patch.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('mark-all-read');
    });
  });

  describe('getPreferences()', () => {
    it('calls GET /notifications/preferences', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));
      await service.getPreferences();
      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('/notifications/preferences');
    });
  });

  describe('upsertPreferences()', () => {
    it('calls POST /notifications/preferences with prefs array', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse(undefined)));
      const prefs: any[] = [{ event_type: 'low_stock', in_app: true, email: false, push: false }];
      await service.upsertPreferences(prefs);
      expect(fetchSpy.post).toHaveBeenCalledWith(jasmine.objectContaining({ values: prefs }));
    });
  });

  describe('polling', () => {
    it('startPolling does not throw and stopPolling clears interval', () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse({ count: 3 })));
      expect(() => service.startPolling(999999)).not.toThrow();
      expect(() => service.stopPolling()).not.toThrow();
    });

    it('startPolling is idempotent — calling twice does not create two intervals', () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse({ count: 0 })));
      service.startPolling(999999);
      const firstPollSpy = (service as any)._pollInterval;
      service.startPolling(999999);
      expect((service as any)._pollInterval).toBe(firstPollSpy);
      service.stopPolling();
    });
  });
});
