import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { AlertService } from '../../services/extras/alert.service';
import { LanguageService } from '../../services/extras/language.service';
import { LanguageSwitcherComponent } from '../extras/language-switcher/language-switcher.component';
import { AlertComponent } from '../extras/alert/alert.component';
import { LoginRequest, RegisterRequest } from '../../models/auth.model';
import { User } from '../../models/user.model';

// Models and interfaces
interface LoginFormData {
  email: string;
  password: string;
}

interface RegisterFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LanguageSwitcherComponent, AlertComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  // Form controls
  loginForm!: FormGroup;
  registerForm!: FormGroup;
  
  // UI state
  activeTab: 'login' | 'register' = 'login';
  showPassword = false;
  showRegisterPassword = false;
  
  // Loading states
  isLoginLoading = false;
  isRegisterLoading = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private userService: UserService,
    private alertService: AlertService,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.initializeForms();
  }

  private initializeForms(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });

    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  // Tab switching
  setActiveTab(tab: 'login' | 'register'): void {
    this.activeTab = tab;
  }

  // Password visibility toggles
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleRegisterPasswordVisibility(): void {
    this.showRegisterPassword = !this.showRegisterPassword;
  }

  // Form submissions
  async onLogin(): Promise<void> {
    if (this.loginForm.valid) {
      this.isLoginLoading = true;
      
      try {
        const formData: LoginRequest = this.loginForm.value;
        console.log('Login attempt:', formData);
        
        // Use AuthService for login
        const response = await this.authService.login(formData);
        
        if (response.result.success) {
          console.log('Login successful:', response.result.message);
          this.alertService.success(
            this.t('auth.login_success') || 'Inicio de sesión exitoso',
            this.t('auth.welcome_back') || 'Bienvenido'
          );
          // AuthService handles navigation automatically
        } else {
          this.alertService.error(
            response.result.message || this.t('auth.login_error') || 'Error al iniciar sesión',
            this.t('auth.login_failed') || 'Error de autenticación'
          );
        }
        
      } catch (error: any) {
        console.error('Login error:', error);
        this.alertService.error(
          error.message || this.t('auth.login_error') || 'Error al iniciar sesión',
          this.t('auth.login_failed') || 'Error de autenticación'
        );
      } finally {
        this.isLoginLoading = false;
      }
    } else {
      this.markFormGroupTouched(this.loginForm);
    }
  }

  async onRegister(): Promise<void> {
    if (this.registerForm.valid) {
      this.isRegisterLoading = true;
      
      try {
        const formData = this.registerForm.value;
        
        // Map form data to User format for UserService
        const userData: Partial<User> = {
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          role: 'operator', // Default role
          is_active: true,
          auth_provider: 'local'
        };
        
        console.log('Register attempt:', userData);
        
        // Use UserService for user creation
        const response = await this.userService.create(userData);
        
        if (response.result.success) {
          console.log('User created successfully:', response.result.message);
          // Switch to login tab after successful registration
          this.setActiveTab('login');
          // Show success message
          this.alertService.success(
            this.t('auth.registration_success') || 'Usuario creado exitosamente. Por favor inicia sesión.',
            this.t('auth.registration_complete') || 'Registro exitoso'
          );
        } else {
          this.alertService.error(
            response.result.message || this.t('auth.registration_error') || 'Error al crear la cuenta',
            this.t('auth.registration_failed') || 'Error de registro'
          );
        }
        
      } catch (error: any) {
        console.error('Registration error:', error);
        this.alertService.error(
          error.message || this.t('auth.registration_error') || 'Error al crear la cuenta',
          this.t('auth.registration_failed') || 'Error de registro'
        );
      } finally {
        this.isRegisterLoading = false;
      }
    } else {
      this.markFormGroupTouched(this.registerForm);
    }
  }

  // Helper methods
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  // Translation helper
  t(key: string): string {
    return this.languageService.t(key);
  }
}
