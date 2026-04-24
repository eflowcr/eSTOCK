import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SignupService } from '../../../services/signup.service';
import { AlertService } from '../../../services/extras/alert.service';
import { LanguageService } from '../../../services/extras/language.service';
import { AlertComponent } from '../../shared/extras/alert/alert.component';
import { handleApiError } from '@app/utils';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('admin_password');
  const confirm = control.get('admin_password_confirm');
  if (!password || !confirm) return null;
  return password.value !== confirm.value ? { passwordMismatch: true } : null;
}

function slugValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  if (!value) return null;
  return /^[a-z0-9-]{3,32}$/.test(value) ? null : { invalidSlug: true };
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AlertComponent],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css',
})
export class SignupComponent implements OnInit {
  form!: FormGroup;
  isLoading = false;
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  passwordStrength = signal(0); // 0-4

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private signupService: SignupService,
    private alertService: AlertService,
    private languageService: LanguageService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        company_name: ['', [Validators.required, Validators.minLength(3)]],
        tenant_slug: ['', [Validators.required, slugValidator]],
        admin_name: ['', [Validators.required, Validators.minLength(2)]],
        admin_password: ['', [Validators.required, Validators.minLength(8)]],
        admin_password_confirm: ['', [Validators.required]],
      },
      { validators: passwordMatchValidator },
    );

    // Auto-suggest slug from company name
    this.form.get('company_name')?.valueChanges.subscribe((name: string) => {
      if (name && !this.form.get('tenant_slug')?.dirty) {
        const slug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .substring(0, 32);
        this.form.get('tenant_slug')?.setValue(slug, { emitEvent: false });
      }
    });

    // Password strength meter
    this.form.get('admin_password')?.valueChanges.subscribe((pw: string) => {
      this.passwordStrength.set(this.calcStrength(pw));
    });
  }

  private calcStrength(pw: string): number {
    if (!pw || pw.length < 8) return 0;
    let score = 1;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return Math.min(score, 4);
  }

  get strengthLabel(): string {
    const labels = ['', this.t('signup.strength_weak'), this.t('signup.strength_fair'), this.t('signup.strength_good'), this.t('signup.strength_strong')];
    return labels[this.passwordStrength()] ?? '';
  }

  get strengthColor(): string {
    const colors = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
    return colors[this.passwordStrength()] ?? 'bg-gray-200';
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update((v) => !v);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    try {
      const { admin_password_confirm, ...payload } = this.form.value;
      const response = await this.signupService.initiateSignup(payload);
      if (response.result.success) {
        this.router.navigate(['/signup/check-email'], {
          queryParams: { email: this.form.value.email },
        });
      } else {
        this.alertService.error(
          response.result.message || this.t('signup.error_generic'),
          this.t('signup.error_title'),
        );
      }
    } catch (error: any) {
      this.alertService.error(
        handleApiError(error, this.t('signup.error_generic')),
        this.t('signup.error_title'),
      );
    } finally {
      this.isLoading = false;
    }
  }

  t(key: string): string {
    return this.languageService.t(key);
  }
}
