import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { OnboardingWizardComponent } from './onboarding-wizard.component';
import { UserService } from '../../services/user.service';
import { ArticleService } from '../../services/article.service';
import { AlertService } from '../../services/extras/alert.service';
import { LanguageService } from '../../services/extras/language.service';
import { AuthService } from '../../services/auth.service';
import { mockResponse } from '../../../__tests__/mocks/data';

const STORAGE_KEY = 'onboarding_progress';

describe('OnboardingWizardComponent', () => {
  let component: OnboardingWizardComponent;
  let fixture: ComponentFixture<OnboardingWizardComponent>;
  let userSpy: jasmine.SpyObj<UserService>;
  let articleSpy: jasmine.SpyObj<ArticleService>;
  let router: Router;

  const langSpy = jasmine.createSpyObj('LanguageService', ['t']);
  const alertSpy = jasmine.createSpyObj('AlertService', ['success', 'error', 'info']);
  const authSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser', 'isAuthenticated']);

  beforeEach(async () => {
    userSpy = jasmine.createSpyObj('UserService', ['create']);
    articleSpy = jasmine.createSpyObj('ArticleService', ['create']);
    langSpy.t.and.callFake((key: string) => key);
    authSpy.getCurrentUser.and.returnValue({ user_id: '1', user_name: 'Admin', email: 'a@b.com', role: 'admin' });
    localStorage.removeItem(STORAGE_KEY);

    await TestBed.configureTestingModule({
      imports: [OnboardingWizardComponent, ReactiveFormsModule, HttpClientTestingModule, RouterModule.forRoot([])],
      providers: [
        { provide: UserService, useValue: userSpy },
        { provide: ArticleService, useValue: articleSpy },
        { provide: AlertService, useValue: alertSpy },
        { provide: LanguageService, useValue: langSpy },
        { provide: AuthService, useValue: authSpy },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    fixture = TestBed.createComponent(OnboardingWizardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start at step 1', () => {
    expect(component.currentStep()).toBe(1);
  });

  it('goNext should increment step', () => {
    component.goNext();
    expect(component.currentStep()).toBe(2);
  });

  it('goBack should decrement step', () => {
    component.currentStep.set(2);
    component.goBack();
    expect(component.currentStep()).toBe(1);
  });

  it('goBack should not go below step 1', () => {
    component.goBack();
    expect(component.currentStep()).toBe(1);
  });

  it('goNext should not go above totalSteps', () => {
    component.currentStep.set(3);
    component.goNext();
    expect(component.currentStep()).toBe(3);
  });

  it('skipAll navigates to dashboard', () => {
    component.skipAll();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('skipStep from step 2 goes to step 3', () => {
    component.currentStep.set(2);
    component.skipStep();
    expect(component.currentStep()).toBe(3);
  });

  it('skipStep from step 3 calls finish (navigate to dashboard)', () => {
    component.currentStep.set(3);
    component.skipStep();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('progress computed correctly at step 1', () => {
    component.currentStep.set(1);
    expect(component.progress()).toBe(33);
  });

  it('progress computed correctly at step 3', () => {
    component.currentStep.set(3);
    expect(component.progress()).toBe(100);
  });

  it('saves progress to localStorage on goNext', () => {
    component.goNext();
    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.step).toBe(2);
  });

  it('restores step from localStorage on init', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step: 3 }));
    const fixture2 = TestBed.createComponent(OnboardingWizardComponent);
    const comp2 = fixture2.componentInstance;
    fixture2.detectChanges();
    expect(comp2.currentStep()).toBe(3);
    localStorage.removeItem(STORAGE_KEY);
  });

  it('onInviteSubmit calls userService.create and advances to step 3', fakeAsync(async () => {
    userSpy.create.and.returnValue(Promise.resolve(mockResponse({})));
    component.currentStep.set(2);
    component.inviteForm.setValue({
      email: 'op@acme.com',
      first_name: 'Operator',
      last_name: 'User',
      role_id: 'role-123',
    });

    await component.onInviteSubmit();
    tick();

    expect(userSpy.create).toHaveBeenCalledTimes(1);
    expect(component.currentStep()).toBe(3);
  }));

  it('onArticleSubmit calls articleService.create and navigates to dashboard', fakeAsync(async () => {
    articleSpy.create.and.returnValue(Promise.resolve(mockResponse({})));
    component.currentStep.set(3);
    component.articleForm.setValue({
      sku: 'PROD-001',
      name: 'My Product',
      presentation: 'unit',
    });

    await component.onArticleSubmit();
    tick();

    expect(articleSpy.create).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  }));

  it('onInviteSubmit shows error when userService.create fails', fakeAsync(async () => {
    userSpy.create.and.returnValue(Promise.reject(new Error('Server error')));
    component.currentStep.set(2);
    component.inviteForm.setValue({
      email: 'op@acme.com',
      first_name: 'Operator',
      last_name: 'User',
      role_id: 'role-123',
    });

    await component.onInviteSubmit();
    tick();

    expect(alertSpy.error).toHaveBeenCalled();
    expect(component.currentStep()).toBe(2);
  }));
});
