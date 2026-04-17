import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NotificationsBellComponent } from './notifications-bell.component';
import { NotificationsService } from '@app/services/notifications.service';
import { LanguageService } from '@app/services/extras/language.service';
import { MOCK_NOTIFICATION_UNREAD, MOCK_NOTIFICATION_READ, mockResponse } from '../../../../__tests__/mocks/data';

describe('NotificationsBellComponent', () => {
  let component: NotificationsBellComponent;
  let fixture: ComponentFixture<NotificationsBellComponent>;
  let notifSpy: jasmine.SpyObj<NotificationsService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let langSpy: jasmine.SpyObj<LanguageService>;

  beforeEach(async () => {
    notifSpy = jasmine.createSpyObj('NotificationsService', ['countUnread', 'list', 'markRead', 'markAllRead']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    langSpy = jasmine.createSpyObj('LanguageService', ['t']);

    notifSpy.countUnread.and.returnValue(Promise.resolve(3));
    notifSpy.list.and.returnValue(Promise.resolve(mockResponse([MOCK_NOTIFICATION_UNREAD, MOCK_NOTIFICATION_READ])));
    notifSpy.markRead.and.returnValue(Promise.resolve(mockResponse(undefined)));
    notifSpy.markAllRead.and.returnValue(Promise.resolve(mockResponse(undefined)));
    langSpy.t.and.callFake((k: string) => k);

    await TestBed.configureTestingModule({
      imports: [NotificationsBellComponent],
      providers: [
        { provide: NotificationsService, useValue: notifSpy },
        { provide: Router, useValue: routerSpy },
        { provide: LanguageService, useValue: langSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsBellComponent);
    component = fixture.componentInstance;
  });

  // ─── rendering ──────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─── badge ──────────────────────────────────────────────────────────────────

  it('shows unread badge when count > 0', fakeAsync(async () => {
    fixture.detectChanges();
    await Promise.resolve(); // flush countUnread + list
    tick(0);
    fixture.detectChanges();

    component.unreadCount = 5;
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('span.bg-red-500');
    expect(badge).toBeTruthy();
    expect(badge.textContent.trim()).toBe('5');
  }));

  it('shows 99+ when count exceeds 99', fakeAsync(async () => {
    fixture.detectChanges();
    tick(0);
    component.unreadCount = 150;
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('span.bg-red-500');
    expect(badge.textContent.trim()).toBe('99+');
  }));

  it('hides badge when count is 0', fakeAsync(async () => {
    component.unreadCount = 0;
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('span.bg-red-500');
    expect(badge).toBeNull();
  }));

  // ─── polling ────────────────────────────────────────────────────────────────

  it('calls refresh on init and sets up polling interval', fakeAsync(() => {
    fixture.detectChanges(); // triggers ngOnInit

    expect(notifSpy.countUnread).toHaveBeenCalledTimes(1);

    tick(60000);
    expect(notifSpy.countUnread).toHaveBeenCalledTimes(2);

    tick(60000);
    expect(notifSpy.countUnread).toHaveBeenCalledTimes(3);

    component.ngOnDestroy();
    tick(60000);
    expect(notifSpy.countUnread).toHaveBeenCalledTimes(3); // no more calls after destroy
  }));

  it('clears interval on destroy', fakeAsync(() => {
    fixture.detectChanges();
    expect(component['intervalId']).not.toBeNull();

    component.ngOnDestroy();
    expect(component['intervalId']).toBeNull();
  }));

  // ─── item click ─────────────────────────────────────────────────────────────

  it('marks notification as read on click when unread', async () => {
    const unread = { ...MOCK_NOTIFICATION_UNREAD };
    component.notifications = [unread];

    await component.onItemClick(unread);

    expect(notifSpy.markRead).toHaveBeenCalledWith('notif-001');
    expect(unread.is_read).toBe(true);
  });

  it('does not call markRead when notification is already read', async () => {
    const read = { ...MOCK_NOTIFICATION_READ };
    component.notifications = [read];

    await component.onItemClick(read);

    expect(notifSpy.markRead).not.toHaveBeenCalled();
  });

  it('navigates to picking-tasks/:id for picking_task resource', async () => {
    const notif = { ...MOCK_NOTIFICATION_UNREAD, resource_type: 'picking_task', resource_id: 'task-001' };

    await component.onItemClick(notif);

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/picking-tasks', 'task-001']);
  });

  // ─── markAllRead ────────────────────────────────────────────────────────────

  it('marks all notifications as read and resets count', async () => {
    component.notifications = [
      { ...MOCK_NOTIFICATION_UNREAD },
      { ...MOCK_NOTIFICATION_READ },
    ];
    component.unreadCount = 1;

    await component.markAllRead();

    expect(notifSpy.markAllRead).toHaveBeenCalled();
    expect(component.unreadCount).toBe(0);
    component.notifications.forEach(n => expect(n.is_read).toBe(true));
  });
});
