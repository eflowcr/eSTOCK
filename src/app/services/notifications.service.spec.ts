import { TestBed } from '@angular/core/testing';
import { NotificationsService } from './notifications.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';
import { Notification, NotificationPreference } from '@app/models/notification.model';

const MOCK_NOTIFICATION: Notification = {
  id: 'notif-001',
  user_id: 'user-001',
  event_type: 'task_assigned',
  title: 'Task assigned',
  body: 'You have a new task',
  resource_type: 'picking_task',
  resource_id: 'task-001',
  channels: 'in_app',
  is_read: false,
  created_at: '2026-04-17T10:00:00Z',
};

const MOCK_PREFERENCE: NotificationPreference = {
  user_id: 'user-001',
  event_type: 'task_assigned',
  in_app: true,
  email: true,
  push: false,
  updated_at: '2026-04-17T10:00:00Z',
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'patch', 'put']);

    TestBed.configureTestingModule({
      providers: [
        NotificationsService,
        { provide: FetchService, useValue: fetchSpy },
      ],
    });

    service = TestBed.inject(NotificationsService);
  });

  // ─── list ─────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('fetches notifications without filters', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([MOCK_NOTIFICATION])));

      const result = await service.list();

      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('/notifications') })
      );
      expect(result.data[0].id).toBe('notif-001');
    });

    it('appends query params when filters provided', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));

      await service.list({ unread: true, limit: 10 });

      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).toContain('unread=true');
      expect(url).toContain('limit=10');
    });

    it('omits undefined and empty values from query string', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([])));

      await service.list({ unread: undefined, event_type: undefined });

      const url: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
      expect(url).not.toContain('?');
    });
  });

  // ─── countUnread ──────────────────────────────────────────────────────────

  describe('countUnread()', () => {
    it('returns the unread count from response', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse({ count: 5 })));

      const count = await service.countUnread();

      expect(count).toBe(5);
      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('/count') })
      );
    });

    it('returns 0 when data is missing', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(null as any)));

      const count = await service.countUnread();

      expect(count).toBe(0);
    });
  });

  // ─── markRead ─────────────────────────────────────────────────────────────

  describe('markRead()', () => {
    it('sends PATCH to /{id}/read', async () => {
      fetchSpy.patch.and.returnValue(Promise.resolve(mockResponse(undefined)));

      await service.markRead('notif-001');

      expect(fetchSpy.patch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          API_Gateway: jasmine.stringContaining('notif-001/read'),
          values: {},
        })
      );
    });
  });

  // ─── markAllRead ──────────────────────────────────────────────────────────

  describe('markAllRead()', () => {
    it('sends PATCH to /mark-all-read', async () => {
      fetchSpy.patch.and.returnValue(Promise.resolve(mockResponse(undefined)));

      await service.markAllRead();

      expect(fetchSpy.patch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          API_Gateway: jasmine.stringContaining('mark-all-read'),
          values: {},
        })
      );
    });
  });

  // ─── getPreferences ───────────────────────────────────────────────────────

  describe('getPreferences()', () => {
    it('fetches preferences from /preferences endpoint', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse([MOCK_PREFERENCE])));

      const result = await service.getPreferences();

      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('/preferences') })
      );
      expect(result.data[0].event_type).toBe('task_assigned');
    });
  });

  // ─── upsertPreferences ────────────────────────────────────────────────────

  describe('upsertPreferences()', () => {
    it('sends PUT to /preferences with the payload', async () => {
      fetchSpy.put.and.returnValue(Promise.resolve(mockResponse(undefined)));

      const payload = [{ event_type: 'task_assigned' as const, in_app: true, email: false, push: false }];
      await service.upsertPreferences(payload);

      expect(fetchSpy.put).toHaveBeenCalledWith(
        jasmine.objectContaining({
          API_Gateway: jasmine.stringContaining('/preferences'),
          values: payload,
        })
      );
    });
  });
});
