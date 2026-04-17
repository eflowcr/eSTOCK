import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NotificationsPageComponent } from './notifications-page.component';
import { NotificationsService } from '@app/services/notifications.service';
import { LanguageService } from '@app/services/extras/language.service';
import { AlertService } from '@app/services/extras/alert.service';
import { MOCK_NOTIFICATIONS, mockResponse } from '../../../__tests__/mocks/data';

describe('NotificationsPageComponent', () => {
  let component: NotificationsPageComponent;
  let fixture: ComponentFixture<NotificationsPageComponent>;
  let notifSpy: jasmine.SpyObj<NotificationsService>;
  let alertSpy: jasmine.SpyObj<AlertService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let langSpy: jasmine.SpyObj<LanguageService>;

  beforeEach(async () => {
    notifSpy = jasmine.createSpyObj('NotificationsService', ['list', 'markRead', 'markAllRead']);
    alertSpy = jasmine.createSpyObj('AlertService', ['success', 'error']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    langSpy = jasmine.createSpyObj('LanguageService', ['t']);

    notifSpy.list.and.returnValue(Promise.resolve(mockResponse(MOCK_NOTIFICATIONS)));
    notifSpy.markRead.and.returnValue(Promise.resolve(mockResponse(undefined)));
    notifSpy.markAllRead.and.returnValue(Promise.resolve(mockResponse(undefined)));
    langSpy.t.and.callFake((k: string) => k);

    await TestBed.configureTestingModule({
      imports: [NotificationsPageComponent],
      providers: [
        { provide: NotificationsService, useValue: notifSpy },
        { provide: AlertService, useValue: alertSpy },
        { provide: Router, useValue: routerSpy },
        { provide: LanguageService, useValue: langSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─── loading ────────────────────────────────────────────────────────────────

  it('loads notifications on init', fakeAsync(async () => {
    fixture.detectChanges();
    await Promise.resolve();
    tick(0);
    fixture.detectChanges();

    expect(notifSpy.list).toHaveBeenCalledWith(
      jasmine.objectContaining({ limit: 20, offset: 0 })
    );
    expect(component.notifications.length).toBe(2);
  }));

  // ─── filters ────────────────────────────────────────────────────────────────

  it('passes unread=true when filter is "unread"', fakeAsync(async () => {
    fixture.detectChanges();
    tick(0);

    component.setReadFilter('unread');
    await Promise.resolve();
    tick(0);

    const lastCall = notifSpy.list.calls.mostRecent()?.args[0];
    expect(lastCall?.unread).toBe(true);
  }));

  it('passes event_type when filter is set', fakeAsync(async () => {
    fixture.detectChanges();
    tick(0);

    component.eventTypeFilter = 'low_stock';
    component.onFilterChange();
    await Promise.resolve();
    tick(0);

    const lastCall = notifSpy.list.calls.mostRecent()?.args[0];
    expect(lastCall?.event_type).toBe('low_stock');
  }));

  it('resets to page 0 on filter change', fakeAsync(async () => {
    fixture.detectChanges();
    tick(0);

    component.currentPage = 2;
    component.setReadFilter('read');
    await Promise.resolve();
    tick(0);

    expect(component.currentPage).toBe(0);
  }));

  it('clears all filters and reloads', fakeAsync(async () => {
    fixture.detectChanges();
    tick(0);

    component.readFilter = 'unread';
    component.eventTypeFilter = 'low_stock';
    component.fromDate = '2026-01-01';

    component.clearFilters();
    await Promise.resolve();
    tick(0);

    expect(component.readFilter).toBe('all');
    expect(component.eventTypeFilter).toBe('');
    expect(component.fromDate).toBe('');
    expect(notifSpy.list).toHaveBeenCalledTimes(2); // init + clear
  }));

  // ─── markAllRead ────────────────────────────────────────────────────────────

  it('marks all notifications as read and shows success alert', fakeAsync(async () => {
    fixture.detectChanges();
    await Promise.resolve();
    tick(0);

    await component.markAllRead();

    expect(notifSpy.markAllRead).toHaveBeenCalled();
    expect(alertSpy.success).toHaveBeenCalled();
    component.notifications.forEach(n => expect(n.is_read).toBe(true));
  }));

  // ─── pagination ─────────────────────────────────────────────────────────────

  it('increments page on nextPage', fakeAsync(async () => {
    fixture.detectChanges();
    tick(0);
    component.totalPages = 3;
    component.currentPage = 0;

    component.nextPage();
    await Promise.resolve();
    tick(0);

    expect(component.currentPage).toBe(1);
    expect(notifSpy.list).toHaveBeenCalledTimes(2);
  }));

  it('does not go below page 0 on prevPage', fakeAsync(async () => {
    fixture.detectChanges();
    tick(0);
    component.currentPage = 0;

    component.prevPage();

    expect(component.currentPage).toBe(0);
    expect(notifSpy.list).toHaveBeenCalledTimes(1); // no second call
  }));
});
