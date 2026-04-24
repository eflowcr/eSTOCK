import { TestBed } from '@angular/core/testing';
import { TrialService } from './trial.service';
import { FetchService } from './extras/fetch.service';
import { mockResponse } from '../../__tests__/mocks/data';
import { TrialStatus } from './trial.service';

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

describe('TrialService', () => {
  let service: TrialService;
  let fetchSpy: jasmine.SpyObj<FetchService>;

  beforeEach(() => {
    fetchSpy = jasmine.createSpyObj('FetchService', ['get']);

    TestBed.configureTestingModule({
      providers: [
        TrialService,
        { provide: FetchService, useValue: fetchSpy },
      ],
    });

    service = TestBed.inject(TrialService);
  });

  it('returns trial status with computed days_left', async () => {
    const trialEndsAt = daysFromNow(10);
    fetchSpy.get.and.returnValue(
      Promise.resolve(mockResponse<TrialStatus>({ status: 'trial', trial_ends_at: trialEndsAt, days_left: 10 }))
    );

    const result = await service.getCurrentTrialStatus();

    expect(result.status).toBe('trial');
    expect(result.days_left).toBeGreaterThanOrEqual(9); // ceiling might vary by ms
    expect(result.days_left).toBeLessThanOrEqual(11);
  });

  it('returns 0 days_left when trial_ends_at is null', async () => {
    fetchSpy.get.and.returnValue(
      Promise.resolve(mockResponse<TrialStatus>({ status: 'past_due', trial_ends_at: null, days_left: 0 }))
    );

    const result = await service.getCurrentTrialStatus();

    expect(result.days_left).toBe(0);
  });

  it('returns 0 days_left when trial_ends_at is in the past', async () => {
    const pastDate = daysFromNow(-5);
    fetchSpy.get.and.returnValue(
      Promise.resolve(mockResponse<TrialStatus>({ status: 'past_due', trial_ends_at: pastDate, days_left: 0 }))
    );

    const result = await service.getCurrentTrialStatus();

    expect(result.days_left).toBe(0);
  });

  it('calls /billing/subscription endpoint', async () => {
    fetchSpy.get.and.returnValue(
      Promise.resolve(mockResponse<TrialStatus>({ status: 'active', trial_ends_at: null, days_left: 0 }))
    );

    await service.getCurrentTrialStatus();

    const calledUrl: string = fetchSpy.get.calls.mostRecent().args[0].API_Gateway;
    expect(calledUrl).toContain('/billing/subscription');
  });
});
