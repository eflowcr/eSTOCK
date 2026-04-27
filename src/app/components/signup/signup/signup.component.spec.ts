import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SignupComponent } from './signup.component';
import { SignupService } from '../../../services/signup.service';
import { AlertService } from '../../../services/extras/alert.service';
import { LanguageService } from '../../../services/extras/language.service';
import { mockResponse } from '../../../../__tests__/mocks/data';

describe('SignupComponent', () => {
  let component: SignupComponent;
  let fixture: ComponentFixture<SignupComponent>;
  let signupSpy: jasmine.SpyObj<SignupService>;
  let router: Router;

  const langSpy = jasmine.createSpyObj('LanguageService', ['t']);
  const alertSpy = jasmine.createSpyObj('AlertService', ['success', 'error', 'info']);

  beforeEach(async () => {
    signupSpy = jasmine.createSpyObj('SignupService', ['initiateSignup']);
    langSpy.t.and.callFake((key: string) => key);

    await TestBed.configureTestingModule({
      imports: [SignupComponent, ReactiveFormsModule, HttpClientTestingModule, RouterModule.forRoot([])],
      providers: [
        { provide: SignupService, useValue: signupSpy },
        { provide: AlertService, useValue: alertSpy },
        { provide: LanguageService, useValue: langSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SignupComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('form should be invalid when empty', () => {
    expect(component.form.valid).toBeFalse();
  });

  it('email field should be invalid without valid email', () => {
    component.form.get('email')?.setValue('not-an-email');
    expect(component.form.get('email')?.valid).toBeFalse();
  });

  it('tenant_slug should be invalid with uppercase letters', () => {
    component.form.get('tenant_slug')?.setValue('Invalid-Slug');
    expect(component.form.get('tenant_slug')?.valid).toBeFalse();
  });

  it('tenant_slug should be valid with lowercase letters and hyphens', () => {
    component.form.get('tenant_slug')?.setValue('my-company');
    expect(component.form.get('tenant_slug')?.valid).toBeTrue();
  });

  it('form should be invalid when passwords do not match', () => {
    component.form.get('email')?.setValue('admin@acme.com');
    component.form.get('company_name')?.setValue('ACME Corp');
    component.form.get('tenant_slug')?.setValue('acme-corp');
    component.form.get('admin_name')?.setValue('Admin');
    component.form.get('admin_password')?.setValue('SecurePass123!');
    component.form.get('admin_password_confirm')?.setValue('DifferentPass123!');
    expect(component.form.errors?.['passwordMismatch']).toBeTrue();
  });

  it('form should be valid when all fields are correctly filled', () => {
    component.form.get('email')?.setValue('admin@acme.com');
    component.form.get('company_name')?.setValue('ACME Corp');
    component.form.get('tenant_slug')?.setValue('acme-corp');
    component.form.get('admin_name')?.setValue('Admin User');
    component.form.get('admin_password')?.setValue('SecurePass123!');
    component.form.get('admin_password_confirm')?.setValue('SecurePass123!');
    expect(component.form.valid).toBeTrue();
  });

  it('auto-suggests slug from company name', () => {
    component.form.get('company_name')?.setValue('My Great Company');
    const slug = component.form.get('tenant_slug')?.value as string;
    expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(slug).toContain('my');
  });

  it('password strength returns 0 for short password', () => {
    component.form.get('admin_password')?.setValue('short');
    expect(component.passwordStrength()).toBe(0);
  });

  it('password strength increases for complex passwords', () => {
    component.form.get('admin_password')?.setValue('Str0ng!Pass#2024');
    expect(component.passwordStrength()).toBeGreaterThan(2);
  });

  it('calls initiateSignup and navigates on success', async () => {
    signupSpy.initiateSignup.and.returnValue(
      Promise.resolve(mockResponse({ message: 'Signup initiated' })),
    );
    component.form.setValue({
      email: 'admin@acme.com',
      company_name: 'ACME Corp',
      tenant_slug: 'acme-corp',
      admin_name: 'Admin User',
      admin_password: 'SecurePass123!',
      admin_password_confirm: 'SecurePass123!',
    });

    await component.onSubmit();

    expect(signupSpy.initiateSignup).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(
      ['/signup/check-email'],
      jasmine.objectContaining({ queryParams: { email: 'admin@acme.com' } }),
    );
  });

  it('B1 S3.6: shows success toast before navigating on 202 success', async () => {
    signupSpy.initiateSignup.and.returnValue(
      Promise.resolve(mockResponse({ message: 'Revisa tu correo electrónico para completar el registro' })),
    );
    component.form.setValue({
      email: 'admin@acme.com',
      company_name: 'ACME Corp',
      tenant_slug: 'acme-corp',
      admin_name: 'Admin User',
      admin_password: 'SecurePass123!',
      admin_password_confirm: 'SecurePass123!',
    });

    await component.onSubmit();

    expect(alertSpy.success).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(
      ['/signup/check-email'],
      jasmine.objectContaining({ queryParams: { email: 'admin@acme.com' } }),
    );
  });

  it('B1 S3.6: accepts flat {success:true,message} response shape', async () => {
    // Some backend variants return the flat shape (no envelope) for signup.
    signupSpy.initiateSignup.and.returnValue(
      Promise.resolve({ success: true, message: 'OK' } as any),
    );
    component.form.setValue({
      email: 'admin@acme.com',
      company_name: 'ACME Corp',
      tenant_slug: 'acme-corp',
      admin_name: 'Admin User',
      admin_password: 'SecurePass123!',
      admin_password_confirm: 'SecurePass123!',
    });

    await component.onSubmit();

    expect(alertSpy.success).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalled();
  });

  it('shows error alert when initiateSignup fails', async () => {
    signupSpy.initiateSignup.and.returnValue(Promise.reject(new Error('Network error')));
    component.form.setValue({
      email: 'admin@acme.com',
      company_name: 'ACME Corp',
      tenant_slug: 'acme-corp',
      admin_name: 'Admin User',
      admin_password: 'SecurePass123!',
      admin_password_confirm: 'SecurePass123!',
    });

    await component.onSubmit();

    expect(alertSpy.error).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
