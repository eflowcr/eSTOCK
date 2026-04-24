import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, RouterModule, convertToParamMap } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SignupVerifyComponent } from './signup-verify.component';
import { SignupService } from '../../../services/signup.service';
import { AuthService } from '../../../services/auth.service';
import { AlertService } from '../../../services/extras/alert.service';
import { LanguageService } from '../../../services/extras/language.service';
import { mockResponse } from '../../../../__tests__/mocks/data';

const MOCK_JWT =
  'eyJhbGciOiJIUzI1NiJ9.' +
  btoa(JSON.stringify({ user_id: '1', user_name: 'Admin', email: 'a@b.com', role: 'admin' })) +
  '.sig';

const langSpy = jasmine.createSpyObj('LanguageService', ['t']);
const alertSpy = jasmine.createSpyObj('AlertService', ['success', 'error', 'info']);
const authSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser', 'isAuthenticated']);

async function createFixture(token: string | null): Promise<{ fixture: ComponentFixture<SignupVerifyComponent>; component: SignupVerifyComponent; signupSpy: jasmine.SpyObj<SignupService>; router: Router }> {
  const signupSpy = jasmine.createSpyObj<SignupService>('SignupService', ['verifySignup']);
  langSpy.t.and.callFake((key: string) => key);
  localStorage.clear();

  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [SignupVerifyComponent, ReactiveFormsModule, HttpClientTestingModule, RouterModule.forRoot([])],
    providers: [
      { provide: SignupService, useValue: signupSpy },
      { provide: AuthService, useValue: authSpy },
      { provide: AlertService, useValue: alertSpy },
      { provide: LanguageService, useValue: langSpy },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            queryParamMap: convertToParamMap(token ? { token } : {}),
          },
        },
      },
    ],
  }).compileComponents();

  const router = TestBed.inject(Router);
  spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

  const fixture = TestBed.createComponent(SignupVerifyComponent);
  const component = fixture.componentInstance;
  return { fixture, component, signupSpy, router };
}

describe('SignupVerifyComponent', () => {
  afterEach(() => localStorage.clear());

  it('should set error state when no token in URL', fakeAsync(() => {
    let component: SignupVerifyComponent;
    let fixture: ComponentFixture<SignupVerifyComponent>;

    createFixture(null).then(result => {
      fixture = result.fixture;
      component = result.component;
      fixture.detectChanges();
      tick();
      expect(component.state).toBe('error');
    });
  }));

  it('should call verifySignup on init when token present', fakeAsync(async () => {
    const { fixture, component, signupSpy } = await createFixture('my-token');
    const verifyData = { token: MOCK_JWT, tenant_id: 't1', email: 'a@b.com', name: 'Admin' };
    signupSpy.verifySignup.and.returnValue(Promise.resolve(mockResponse(verifyData)));

    fixture.detectChanges();
    tick(2000);

    expect(signupSpy.verifySignup).toHaveBeenCalledWith('my-token');
  }));

  it('should store JWT and navigate to /onboarding on success', fakeAsync(async () => {
    const { fixture, component, signupSpy, router } = await createFixture('valid-token');
    const verifyData = { token: MOCK_JWT, tenant_id: 't1', email: 'a@b.com', name: 'Admin' };
    signupSpy.verifySignup.and.returnValue(Promise.resolve(mockResponse(verifyData)));

    fixture.detectChanges();
    tick(2000);

    const stored = localStorage.getItem('auth_estock');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.token).toBe(MOCK_JWT);
    expect(router.navigate).toHaveBeenCalledWith(['/onboarding']);
  }));

  it('should set error state when verifySignup throws', fakeAsync(async () => {
    const { fixture, component, signupSpy } = await createFixture('bad-token');
    signupSpy.verifySignup.and.returnValue(Promise.reject(new Error('Invalid token')));

    fixture.detectChanges();
    tick();

    expect(component.state).toBe('error');
    expect(component.errorMessage).toContain('Invalid token');
  }));

  it('should set error state when backend returns failure', fakeAsync(async () => {
    const { fixture, component, signupSpy } = await createFixture('expired-token');
    const failResp = {
      envelope: { transaction_type: 'response', encrypted: false, encryption_type: 'none' },
      result: { success: false, message: 'Token expired', endpoint_code: '400' },
      data: null as any,
    };
    signupSpy.verifySignup.and.returnValue(Promise.resolve(failResp));

    fixture.detectChanges();
    tick();

    expect(component.state).toBe('error');
  }));
});
