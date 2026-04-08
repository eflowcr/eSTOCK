import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AlertService } from '../../services/extras/alert.service';
import { LanguageService } from '../../services/extras/language.service';
import { LanguageSwitcherComponent } from '../shared/extras/language-switcher/language-switcher.component';
import { AlertComponent } from '../shared/extras/alert/alert.component';
import { handleApiError } from '@app/utils';
import { LoginRequest } from '../../models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LanguageSwitcherComponent, AlertComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  showPassword = false;
  isLoginLoading = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private alertService: AlertService,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  async onLogin(): Promise<void> {
    if (this.loginForm.valid) {
      this.isLoginLoading = true;
      try {
        const formData: LoginRequest = this.loginForm.value;
        const response = await this.authService.login(formData);
        if (response.result.success) {
          this.alertService.success(
            this.t('auth.login_success') || 'Inicio de sesión exitoso',
            this.t('auth.welcome_back') || 'Bienvenido'
          );
        } else {
          this.alertService.error(
            response.result.message || this.t('auth.login_error') || 'Error al iniciar sesión',
            this.t('auth.login_failed') || 'Error de autenticación'
          );
        }
      } catch (error: any) {
        this.alertService.error(
          handleApiError(error, this.t('auth.login_error') || 'Error al iniciar sesión'),
          this.t('auth.login_failed') || 'Error de autenticación'
        );
      } finally {
        this.isLoginLoading = false;
      }
    } else {
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
    }
  }

  t(key: string): string {
    return this.languageService.t(key);
  }
}
