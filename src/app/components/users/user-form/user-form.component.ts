import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { User } from '../../../models/user.model';
import { UserService } from '../../../services/user.service';
import { LanguageService } from '../../../services/extras/language.service';
import { AlertService } from '../../../services/extras/alert.service';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.css']
})
export class UserFormComponent implements OnInit, OnChanges {
  @Input() initialData?: User | null;
  @Input() isOpen = false;
  @Output() success = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  userForm!: FormGroup;
  isEditing = false;
  isSubmitting = false;
  imagePreview: string | null = null;

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
    if (changes['initialData'] && this.userForm) {
      this.isEditing = !!this.initialData;
      this.initializeForm(); // Reinitialize form to handle password validation
      this.loadUserData();
    }
    
    if (changes['isOpen'] && !changes['isOpen'].currentValue) {
      // Reset form when dialog closes
      this.userForm?.reset();
      this.imagePreview = null;
    }
  }

  get t() {
    return this.languageService.t.bind(this.languageService);
  }

  private initializeForm(): void {
    this.userForm = this.fb.group({
      id: [''],
      email: ['', [Validators.required, Validators.email]],
      first_name: ['', [Validators.required]],
      last_name: ['', [Validators.required]],
      password: [''],
      role: ['admin', [Validators.required]],
      is_active: [true, [Validators.required]]
    });
    
    // Add password validation for new users
    if (!this.isEditing) {
      this.userForm.get('password')?.setValidators([Validators.required]);
    }
  }

  private loadUserData(): void {
    if (!this.initialData) return;

    this.userForm.patchValue({
      id: this.initialData.id,
      email: this.initialData.email,
      first_name: this.initialData.first_name,
      last_name: this.initialData.last_name,
      password: '', // Always empty for editing
      role: this.initialData.role,
      is_active: this.initialData.is_active
    });
    
    // Remove password validation for editing
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
  }

  // Field validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.userForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) {
        return this.t(`user_management.${fieldName}_required`);
      }
      if (field.errors['email']) {
        return this.t('user_management.invalid_email');
      }
    }
    return '';
  }

  // Image handling methods
  onImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
      };
      
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.imagePreview = null;
  }

  async onSubmit(): Promise<void> {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    try {
      const formData = { ...this.userForm.value };
      
      // Remove empty password for updates
      if (this.isEditing && !formData.password) {
        delete formData.password;
      }
      
      // Remove id for new users
      if (!this.isEditing) {
        delete formData.id;
        formData.auth_provider = 'local';
      }

      let response;
      if (this.isEditing && this.initialData) {
        response = await this.userService.update(this.initialData.id, formData);
      } else {
        response = await this.userService.create(formData);
      }

      if (response.result.success) {
        this.alertService.success(
          this.t('user_management.success'),
          this.isEditing ? this.t('user_management.user_updated') : this.t('user_management.user_created')
        );
        
        this.close();
        this.success.emit();
      } else {
        throw new Error(response.result.message || this.t('operation_failed'));
      }
    } catch (error: any) {
      let errorMessage = this.isEditing ? 
        this.t('user_management.failed_update') : 
        this.t('user_management.failed_create');
      
      // Parse specific error messages
      if (error.message?.includes('email')) {
        errorMessage = this.t('user_management.email_registered');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      this.alertService.error(
        this.t('user_management.error'),
        errorMessage
      );
    } finally {
      this.isSubmitting = false;
    }
  }

  close(): void {
    this.userForm.reset();
    this.imagePreview = null;
    this.closed.emit();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
