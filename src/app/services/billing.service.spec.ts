import { TestBed } from '@angular/core/testing';
import { BillingService } from './billing.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';
import { Subscription, BillingPlan } from '@app/models/billing.model';

const MOCK_SUBSCRIPTION_TRIAL: Subscription = {
  plan: 'trial',
  status: 'trialing',
  trial_ends_at: '2026-05-07T00:00:00Z',
  cancel_at_period_end: false,
};

const MOCK_SUBSCRIPTION_PRO: Subscription = {
  plan: 'pro',
  status: 'active',
  current_period_end: '2026-05-23T00:00:00Z',
  cancel_at_period_end: false,
};

describe('BillingService', () => {
  let service: BillingService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get', 'post']);

    TestBed.configureTestingModule({
      providers: [
        BillingService,
        { provide: FetchService, useValue: fetchSpy },
      ],
    });

    service = TestBed.inject(BillingService);
  });

  // ─── getSubscription ──────────────────────────────────────────────────────

  describe('getSubscription()', () => {
    it('returns subscription data from the API', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(MOCK_SUBSCRIPTION_TRIAL)));

      const result = await service.getSubscription();

      expect(fetchSpy.get).toHaveBeenCalledWith(
        jasmine.objectContaining({ API_Gateway: jasmine.stringContaining('/billing/subscription') })
      );
      expect(result.data.plan).toBe('trial');
      expect(result.data.status).toBe('trialing');
    });

    it('caches the subscription for isFeatureAvailable()', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(MOCK_SUBSCRIPTION_PRO)));

      await service.getSubscription();

      expect(service.getCachedSubscription()?.plan).toBe('pro');
    });

    it('does not cache on failed response', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(null as any, false)));

      await service.getSubscription();

      expect(service.getCachedSubscription()).toBeNull();
    });
  });

  // ─── createCheckoutSession ────────────────────────────────────────────────

  describe('createCheckoutSession()', () => {
    it('POSTs to /billing/checkout with the plan', async () => {
      const mockUrl = { url: 'https://checkout.stripe.com/pay/session_xxx' };
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse(mockUrl)));

      const result = await service.createCheckoutSession('pro');

      expect(fetchSpy.post).toHaveBeenCalledWith(
        jasmine.objectContaining({
          API_Gateway: jasmine.stringContaining('/billing/checkout'),
          values: { plan: 'pro' },
        })
      );
      expect(result.data.url).toContain('stripe.com');
    });

    it('sends the correct plan for starter', async () => {
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse({ url: 'https://checkout.stripe.com/starter' })));

      await service.createCheckoutSession('starter');

      const payload = fetchSpy.post.calls.mostRecent().args[0];
      expect((payload as any).values.plan).toBe('starter');
    });
  });

  // ─── createPortalSession ──────────────────────────────────────────────────

  describe('createPortalSession()', () => {
    it('POSTs to /billing/portal-session', async () => {
      const mockUrl = { url: 'https://billing.stripe.com/p/session_yyy' };
      fetchSpy.post.and.returnValue(Promise.resolve(mockResponse(mockUrl)));

      const result = await service.createPortalSession();

      expect(fetchSpy.post).toHaveBeenCalledWith(
        jasmine.objectContaining({
          API_Gateway: jasmine.stringContaining('/billing/portal-session'),
        })
      );
      expect(result.data.url).toContain('stripe.com');
    });
  });

  // ─── isFeatureAvailable ───────────────────────────────────────────────────

  describe('isFeatureAvailable()', () => {
    it('returns false when no subscription is cached', () => {
      expect(service.isFeatureAvailable('api_access')).toBeFalse();
    });

    it('returns false for pro feature on trial plan', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(MOCK_SUBSCRIPTION_TRIAL)));
      await service.getSubscription();

      expect(service.isFeatureAvailable('api_access')).toBeFalse();
    });

    it('returns true for api_access on pro plan', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(MOCK_SUBSCRIPTION_PRO)));
      await service.getSubscription();

      expect(service.isFeatureAvailable('api_access')).toBeTrue();
    });

    it('returns true for export_excel on starter plan', async () => {
      const starterSub: Subscription = { plan: 'starter', status: 'active' };
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(starterSub)));
      await service.getSubscription();

      expect(service.isFeatureAvailable('export_excel')).toBeTrue();
    });

    it('returns false for export_excel on trial plan', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(MOCK_SUBSCRIPTION_TRIAL)));
      await service.getSubscription();

      expect(service.isFeatureAvailable('export_excel')).toBeFalse();
    });

    it('returns true for unknown/ungated features', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(MOCK_SUBSCRIPTION_TRIAL)));
      await service.getSubscription();

      // Feature not in FEATURE_PLAN_MATRIX => not gated
      expect(service.isFeatureAvailable('unknown_feature')).toBeTrue();
    });

    it('returns true for enterprise-only feature on enterprise plan', async () => {
      const entSub: Subscription = { plan: 'enterprise', status: 'active' };
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(entSub)));
      await service.getSubscription();

      expect(service.isFeatureAvailable('sla')).toBeTrue();
    });

    it('returns false for enterprise feature on pro plan', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(MOCK_SUBSCRIPTION_PRO)));
      await service.getSubscription();

      expect(service.isFeatureAvailable('sla')).toBeFalse();
    });
  });

  // ─── getCachedSubscription ────────────────────────────────────────────────

  describe('getCachedSubscription()', () => {
    it('returns null before first fetch', () => {
      expect(service.getCachedSubscription()).toBeNull();
    });

    it('returns subscription after fetch', async () => {
      fetchSpy.get.and.returnValue(Promise.resolve(mockResponse(MOCK_SUBSCRIPTION_PRO)));
      await service.getSubscription();

      const cached = service.getCachedSubscription();
      expect(cached?.plan).toBe('pro');
      expect(cached?.status).toBe('active');
    });
  });
});
