import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { User } from '../../../models/user.model';
import { UserService } from '../../../services/user.service';
import { LanguageService } from '../../../services/extras/language.service';
import { AlertService } from '../../../services/extras/alert.service';

@Component({
  selector: 'app-password-change',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './password-change.component.html',
  styleUrls: ['./password-change.component.css']
})
export class PasswordChangeComponent implements OnInit, OnChanges {
  @Input() user?: User | null;
  @Input() isOpen = false;
  @Output() success = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  passwordForm!: FormGroup;
  isSubmitting = false;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private languageService: LanguageService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && !changes['isOpen'].currentValue) {
      // Reset form when dialog closes
      this.passwordForm?.reset();
    }
  }

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  private initializeForm(): void {
    this.passwordForm = this.fb.group({
      newPassword: ['', [Validators.required]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(group: FormGroup): { [key: string]: any } | null {
    const password = group.get('newPassword');
    const confirmPassword = group.get('confirmPassword');
    
    if (!password || !confirmPassword) {
      return null;
    }
    
    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.passwordForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.passwordForm.get(fieldName);
    
    if (!field || !field.errors || !field.touched) {
      return '';
    }

    if (field.errors['required']) {
      return this.t('field_required');
    }

    if (fieldName === 'confirmPassword' && this.passwordForm.errors?.['passwordMismatch']) {
      return this.t('password_mismatch');
    }

    return this.t('field_invalid');
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onCancel(): void {
    this.passwordForm.reset();
    this.closed.emit();
  }

  async onSubmit(): Promise<void> {
    if (this.passwordForm.invalid || !this.user?.id) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    try {
      const formValue = this.passwordForm.value;
      const response = await this.userService.updatePassword(this.user.id, formValue.newPassword);

      if (response.result.success) {
        this.alertService.success(
          this.t('user_management.success'),
          this.t('user_management.password_updated')
        );
        this.passwordForm.reset();
        this.success.emit();
      } else {
        throw new Error(response.result.message || this.t('password_update_failed'));
      }
    } catch (error: any) {
      let errorMessage = this.t('user_management.failed_update_password');
      let errorTitle = this.t('user_management.error');
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      this.alertService.error(errorTitle, errorMessage);
    } finally {
      this.isSubmitting = false;
    }
  }

  getUserDisplayName(): string {
    if (!this.user) return '';
    
    if (this.user.first_name || this.user.last_name) {
      return `${this.user.first_name || ""} ${this.user.last_name || ""}`.trim();
    }
    return this.user.email || this.user.id;
  }
}
