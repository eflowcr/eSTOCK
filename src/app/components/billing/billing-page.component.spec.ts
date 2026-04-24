import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { BillingPageComponent } from './billing-page.component';
import { BillingService } from '@app/services/billing.service';
import { AlertService } from '@app/services/extras/alert.service';
import { LanguageService } from '@app/services/extras/language.service';
import { mockResponse } from '../../../__tests__/mocks/data';
import { Subscription as BillingSubscription } from '@app/models/billing.model';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_TRIAL_SUB: BillingSubscription = {
  plan: 'trial',
  status: 'trialing',
  trial_ends_at: '2026-05-07T00:00:00Z',
  cancel_at_period_end: false,
};

const MOCK_PRO_SUB: BillingSubscription = {
  plan: 'pro',
  status: 'active',
  current_period_end: '2026-05-23T00:00:00Z',
  cancel_at_period_end: false,
};

const mockLang = { t: (k: string) => k };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Response that indicates failure — prevents window.location.href redirect in tests. */
const FAIL_RESPONSE = mockResponse(null as any, false);

let billingSpy: jasmine.SpyObj<BillingService>;
let alertSpy: jasmine.SpyObj<AlertService>;
let qpSubject: BehaviorSubject<Record<string, string>>;
let component: BillingPageComponent;
let fixture: ComponentFixture<BillingPageComponent>;

function setup(sub: BillingSubscription = MOCK_TRIAL_SUB, qp: Record<string, string> = {}) {
  billingSpy = jasmine.createSpyObj('BillingService', [
    'getSubscription', 'createCheckoutSession', 'createPortalSession',
    'getCachedSubscription', 'isFeatureAvailable',
  ]);
  billingSpy.getSubscription.and.returnValue(Promise.resolve(mockResponse(sub)));
  // Default: fail — avoids window.location.href nav in test browser
  billingSpy.createCheckoutSession.and.returnValue(Promise.resolve(FAIL_RESPONSE));
  billingSpy.createPortalSession.and.returnValue(Promise.resolve(FAIL_RESPONSE));
  billingSpy.getCachedSubscription.and.returnValue(sub);
  alertSpy = jasmine.createSpyObj('AlertService', ['error', 'success', 'info', 'warning']);
  qpSubject = new BehaviorSubject<Record<string, string>>(qp);

  TestBed.configureTestingModule({
    imports: [BillingPageComponent, HttpClientTestingModule, RouterModule.forRoot([])],
    providers: [
      { provide: BillingService, useValue: billingSpy },
      { provide: AlertService, useValue: alertSpy },
      { provide: LanguageService, useValue: mockLang },
      { provide: ActivatedRoute, useValue: { queryParams: qpSubject.asObservable() } },
    ],
  });

  fixture = TestBed.createComponent(BillingPageComponent);
  component = fixture.componentInstance;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BillingPageComponent', () => {

  afterEach(() => TestBed.resetTestingModule());

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  it('creates the component', fakeAsync(() => {
    setup();
    fixture.detectChanges();
    tick(500);
    expect(component).toBeTruthy();
  }));

  it('starts in loading state before detectChanges', () => {
    setup();
    expect(component.loading()).toBeTrue();
  });

  it('sets loading to false after subscription resolves', fakeAsync(() => {
    setup();
    fixture.detectChanges();
    tick(500);
    expect(component.loading()).toBeFalse();
  }));

  it('calls getSubscription on init', fakeAsync(() => {
    setup();
    fixture.detectChanges();
    tick(500);
    expect(billingSpy.getSubscription).toHaveBeenCalledTimes(1);
  }));

  it('stores trial subscription in signal', fakeAsync(() => {
    setup(MOCK_TRIAL_SUB);
    fixture.detectChanges();
    tick(500);
    expect(component.subscription()?.plan).toBe('trial');
    expect(component.subscription()?.status).toBe('trialing');
  }));

  it('stores pro subscription in signal', fakeAsync(() => {
    setup(MOCK_PRO_SUB);
    fixture.detectChanges();
    tick(500);
    expect(component.subscription()?.plan).toBe('pro');
    expect(component.subscription()?.status).toBe('active');
  }));

  it('subscription remains null when getSubscription returns failure response', fakeAsync(() => {
    setup();
    billingSpy.getSubscription.and.returnValue(Promise.resolve(mockResponse(null as any, false)));
    fixture.detectChanges();
    tick(500);
    // Non-success responses don't populate the signal
    expect(component.subscription()).toBeNull();
  }));

  // ── Query param detection ─────────────────────────────────────────────────

  it('sets checkoutResult to success when ?checkout=success', fakeAsync(() => {
    setup(MOCK_TRIAL_SUB, { checkout: 'success' });
    fixture.detectChanges();
    tick(500);
    expect(component.checkoutResult()).toBe('success');
  }));

  it('sets checkoutResult to cancelled when ?checkout=cancelled', fakeAsync(() => {
    setup(MOCK_TRIAL_SUB, { checkout: 'cancelled' });
    fixture.detectChanges();
    tick(500);
    expect(component.checkoutResult()).toBe('cancelled');
  }));

  it('leaves checkoutResult null when no checkout param', fakeAsync(() => {
    setup();
    fixture.detectChanges();
    tick(500);
    expect(component.checkoutResult()).toBeNull();
  }));

  // ── selectPlan ────────────────────────────────────────────────────────────

  it('selectPlan sets confirmPlan to the chosen plan', fakeAsync(() => {
    setup();
    fixture.detectChanges();
    tick(500);
    component.selectPlan('pro');
    expect(component.confirmPlan()).toBe('pro');
  }));

  it('selectPlan works for starter', fakeAsync(() => {
    setup();
    fixture.detectChanges();
    tick(500);
    component.selectPlan('starter');
    expect(component.confirmPlan()).toBe('starter');
  }));

  // ── confirmCheckout ───────────────────────────────────────────────────────

  it('confirmCheckout calls createCheckoutSession with the confirmed plan', fakeAsync(() => {
    setup();
    fixture.detectChanges();
    tick(500);
    component.confirmPlan.set('pro');
    component.confirmCheckout();
    tick(500);
    expect(billingSpy.createCheckoutSession).toHaveBeenCalledWith('pro');
  }));

  it('confirmCheckout does nothing when confirmPlan is null', fakeAsync(() => {
    setup();
    fixture.detectChanges();
    tick(500);
    component.confirmPlan.set(null);
    component.confirmCheckout();
    tick(500);
    expect(billingSpy.createCheckoutSession).not.toHaveBeenCalled();
  }));

  it('confirmCheckout shows error toast on API failure', fakeAsync(() => {
    setup();
    // billingSpy.createCheckoutSession already returns FAIL_RESPONSE by default
    fixture.detectChanges();
    tick(500);
    component.confirmPlan.set('starter');
    component.confirmCheckout();
    tick(500);
    expect(alertSpy.error).toHaveBeenCalled();
  }));

  it('confirmCheckout clears checkoutLoading after completion', fakeAsync(() => {
    setup();
    fixture.detectChanges();
    tick(500);
    component.confirmPlan.set('starter');
    component.confirmCheckout();
    tick(500);
    expect(component.checkoutLoading()).toBeNull();
  }));

  // ── openPortal ────────────────────────────────────────────────────────────

  it('openPortal calls createPortalSession', fakeAsync(() => {
    setup();
    fixture.detectChanges();
    tick(500);
    component.openPortal();
    tick(500);
    expect(billingSpy.createPortalSession).toHaveBeenCalled();
  }));

  it('openPortal shows error on API failure', fakeAsync(() => {
    setup();
    // billingSpy.createPortalSession already returns FAIL_RESPONSE by default
    fixture.detectChanges();
    tick(500);
    component.openPortal();
    tick(500);
    expect(alertSpy.error).toHaveBeenCalled();
  }));

  it('openPortal resets portalLoading to false after completion', fakeAsync(() => {
    setup();
    fixture.detectChanges();
    tick(500);
    component.openPortal();
    tick(500);
    expect(component.portalLoading()).toBeFalse();
  }));

  // ── statusBadgeClass ──────────────────────────────────────────────────────

  it('statusBadgeClass — active → emerald', () => {
    setup();
    expect(component.statusBadgeClass('active')).toContain('emerald');
  });

  it('statusBadgeClass — trialing → blue', () => {
    setup();
    expect(component.statusBadgeClass('trialing')).toContain('blue');
  });

  it('statusBadgeClass — past_due → red', () => {
    setup();
    expect(component.statusBadgeClass('past_due')).toContain('red');
  });

  it('statusBadgeClass — cancelled → muted', () => {
    setup();
    expect(component.statusBadgeClass('cancelled')).toContain('muted');
  });

  it('statusBadgeClass — undefined → muted (fallthrough)', () => {
    setup();
    expect(component.statusBadgeClass(undefined)).toContain('muted');
  });

  // ── daysLeft ──────────────────────────────────────────────────────────────

  it('daysLeft — 5 days in future contains 5', () => {
    setup();
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(component.daysLeft(future)).toContain('5');
  });

  it('daysLeft — past date → trial_expired key', () => {
    setup();
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(component.daysLeft(past)).toBe('billing.trial_expired');
  });

  // ── Plans table metadata ──────────────────────────────────────────────────

  it('has exactly 4 plans', () => {
    setup();
    expect(component.plans.length).toBe(4);
  });

  it('plan ids include trial, starter, pro, enterprise', () => {
    setup();
    const ids = component.plans.map(p => p.id);
    expect(ids).toContain('trial');
    expect(ids).toContain('starter');
    expect(ids).toContain('pro');
    expect(ids).toContain('enterprise');
  });
});
