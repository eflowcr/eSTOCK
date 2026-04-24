import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AlertService } from '../../../services/extras/alert.service';
import { LanguageService } from '../../../services/extras/language.service';
import { AlertComponent } from '../../shared/extras/alert/alert.component';
import { handleApiError } from '@app/utils';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AlertComponent],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css',
})
export class ResetPasswordComponent implements OnInit {
  form: FormGroup;
  token: string | null = null;
  isLoading = false;
  completed = false;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private alertService: AlertService,
    private languageService: LanguageService,
  ) {
    this.form = this.fb.group(
      {
        new_password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
        confirm_password: ['', [Validators.required]],
      },
      { validators: [this.passwordMatchValidator] },
    );
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.alertService.error(
        this.t('auth.reset_token_missing') || 'El enlace es inválido. Vuelve a solicitar uno nuevo.',
      );
      this.router.navigate(['/forgot-password']);
    }
  }

  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const p = group.get('new_password')?.value;
    const c = group.get('confirm_password')?.value;
    return p && c && p !== c ? { passwordMismatch: true } : null;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || !this.token) {
      this.form.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    try {
      const response = await this.authService.resetPassword(this.token, this.form.value.new_password);
      if (response.result.success) {
        this.completed = true;
        setTimeout(() => this.router.navigate(['/login']), 2500);
      } else {
        this.alertService.error(
          response.result.message || this.t('auth.reset_error') || 'Error al cambiar la contraseña',
        );
      }
    } catch (error: any) {
      this.alertService.error(
        handleApiError(error, this.t('auth.reset_error') || 'El enlace es inválido o expiró. Solicita uno nuevo.'),
      );
    } finally {
      this.isLoading = false;
    }
  }

  t(key: string): string {
    return this.languageService.t(key);
  }
}
