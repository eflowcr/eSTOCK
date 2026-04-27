import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { TrialBannerComponent } from './trial-banner.component';
import { TrialService, TrialStatus } from '@app/services/trial.service';
import { LanguageService } from '@app/services/extras/language.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeStatus(
  status: TrialStatus['status'],
  daysLeft: number,
  trialEndsAt?: string,
): TrialStatus {
  return {
    status,
    trial_ends_at: trialEndsAt ?? null,
    days_left: daysLeft,
  };
}

function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function pastDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('TrialBannerComponent', () => {
  let component: TrialBannerComponent;
  let fixture: ComponentFixture<TrialBannerComponent>;
  let trialSpy: jasmine.SpyObj<TrialService>;
  let langSpy: jasmine.SpyObj<LanguageService>;

  beforeEach(async () => {
    trialSpy = jasmine.createSpyObj('TrialService', ['getCurrentTrialStatus']);
    langSpy = jasmine.createSpyObj('LanguageService', ['t']);
    langSpy.t.and.callFake((key: string) => key);

    // Default: happy-path trial with 10 days left
    trialSpy.getCurrentTrialStatus.and.returnValue(
      Promise.resolve(makeStatus('trial', 10, futureDate(10)))
    );

    await TestBed.configureTestingModule({
      imports: [TrialBannerComponent, RouterModule.forRoot([])],
      providers: [
        { provide: TrialService, useValue: trialSpy },
        { provide: LanguageService, useValue: langSpy },
      ],
    }).compileComponents();

    // Clear localStorage dismiss key before each test
    localStorage.removeItem('trial_banner_dismissed_day');

    fixture = TestBed.createComponent(TrialBannerComponent);
    component = fixture.componentInstance;
  });

  // ─── visibility ────────────────────────────────────────────────────────────

  it('shows banner when status is trial with future trial_ends_at', fakeAsync(async () => {
    fixture.detectChanges();
    await Promise.resolve();
    tick(0);
    fixture.detectChanges();

    expect(component.visible).toBeTrue();
  }));

  it('hides banner when status is active', fakeAsync(async () => {
    trialSpy.getCurrentTrialStatus.and.returnValue(
      Promise.resolve(makeStatus('active', 0))
    );

    fixture.detectChanges();
    await Promise.resolve();
    tick(0);
    fixture.detectChanges();

    expect(component.visible).toBeFalse();
  }));

  it('shows red persistent banner when status is past_due', fakeAsync(async () => {
    trialSpy.getCurrentTrialStatus.and.returnValue(
      Promise.resolve(makeStatus('past_due', 0))
    );

    fixture.detectChanges();
    await Promise.resolve();
    tick(0);
    fixture.detectChanges();

    expect(component.visible).toBeTrue();
    expect(component.isPastDue).toBeTrue();
    const classes = component.bannerClasses.join(' ');
    expect(classes).toContain('bg-red-600');
  }));

  // ─── color escalation ──────────────────────────────────────────────────────

  it('uses emerald color when days_left > 7', fakeAsync(async () => {
    trialSpy.getCurrentTrialStatus.and.returnValue(
      Promise.resolve(makeStatus('trial', 10, futureDate(10)))
    );

    fixture.detectChanges();
    await Promise.resolve();
    tick(0);

    const classes = component.bannerClasses.join(' ');
    expect(classes).toContain('bg-emerald-600');
  }));

  it('uses amber color when days_left is 4-7', fakeAsync(async () => {
    trialSpy.getCurrentTrialStatus.and.returnValue(
      Promise.resolve(makeStatus('trial', 5, futureDate(5)))
    );

    fixture.detectChanges();
    await Promise.resolve();
    tick(0);

    const classes = component.bannerClasses.join(' ');
    expect(classes).toContain('bg-amber-500');
  }));

  it('uses orange when days_left is 1-2 (B4 S3.6)', fakeAsync(async () => {
    trialSpy.getCurrentTrialStatus.and.returnValue(
      Promise.resolve(makeStatus('trial', 2, futureDate(2)))
    );

    fixture.detectChanges();
    await Promise.resolve();
    tick(0);

    const classes = component.bannerClasses.join(' ');
    expect(classes).toContain('bg-orange-500');
  }));

  it('B4 S3.6: shows safe message with N days when trial_ends_at is 14 days in future', fakeAsync(async () => {
    // Critical regression: server payload said days_left=0 but trial_ends_at
    // was 14 days away → previously "Your trial expires today". Now we
    // recompute on the client and show the safe message.
    trialSpy.getCurrentTrialStatus.and.returnValue(
      Promise.resolve(makeStatus('trial', 0, futureDate(14)))
    );

    fixture.detectChanges();
    await Promise.resolve();
    tick(0);

    const classes = component.bannerClasses.join(' ');
    expect(classes).toContain('bg-emerald-600');
    expect(component.bannerMessage).toContain('14');
    expect(component.bannerMessage).toContain('expires_in_days_safe');
  }));

  it('B4 S3.6: shows expired message when trial_ends_at is in the past', fakeAsync(async () => {
    trialSpy.getCurrentTrialStatus.and.returnValue(
      Promise.resolve(makeStatus('trial', 0, pastDate(2)))
    );

    fixture.detectChanges();
    await Promise.resolve();
    tick(0);

    // visible is false because guard hides trial banner when end is past and
    // status is still 'trial' (backend should flip to past_due). Verify the
    // computed message at least matches the expired key.
    expect(component.bannerMessage).toBe('trial_banner.expired');
  }));

  it('uses pulsing red when days_left is 0', fakeAsync(async () => {
    trialSpy.getCurrentTrialStatus.and.returnValue(
      Promise.resolve(makeStatus('trial', 0, new Date().toISOString()))
    );

    fixture.detectChanges();
    await Promise.resolve();
    tick(0);

    const classes = component.bannerClasses.join(' ');
    expect(classes).toContain('bg-red-600');
    expect(classes).toContain('banner-pulse');
  }));

  // ─── dismiss logic ────────────────────────────────────────────────────────

  it('hides banner after dismiss and stores today in localStorage', fakeAsync(async () => {
    fixture.detectChanges();
    await Promise.resolve();
    tick(0);

    expect(component.visible).toBeTrue();

    component.dismiss();
    fixture.detectChanges();

    const today = new Date().toISOString().slice(0, 10);
    expect(localStorage.getItem('trial_banner_dismissed_day')).toBe(today);
    expect(component.dismissed).toBeTrue();
    expect(component.visible).toBeFalse();
  }));

  it('does NOT dismiss past_due banner', fakeAsync(async () => {
    trialSpy.getCurrentTrialStatus.and.returnValue(
      Promise.resolve(makeStatus('past_due', 0))
    );

    fixture.detectChanges();
    await Promise.resolve();
    tick(0);

    component.dismiss(); // should be no-op

    expect(component.dismissed).toBeFalse();
    expect(component.visible).toBeTrue();
  }));

  it('respects existing dismiss from today and hides banner on init', fakeAsync(async () => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('trial_banner_dismissed_day', today);

    fixture.detectChanges();
    await Promise.resolve();
    tick(0);

    expect(component.dismissed).toBeTrue();
    expect(component.visible).toBeFalse();
  }));
});
