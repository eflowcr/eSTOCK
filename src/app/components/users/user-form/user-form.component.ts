import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { User } from '../../../models/user.model';
import { Role } from '../../../models/role.model';
import { UserService } from '../../../services/user.service';
import { RolesService } from '../../../services/roles.service';
import { LanguageService } from '../../../services/extras/language.service';
import { AlertService } from '../../../services/extras/alert.service';
import { getApiErrorMessage, handleApiError } from '@app/utils';
import { DrawerComponent } from '../../../shared/components/drawer';
import { ZardButtonComponent } from '../../../shared/components/button/button.component';
import { ZardFormImports } from '../../../shared/components/form/form.imports';
import { ZardInputDirective } from '../../../shared/components/input/input.directive';
import { ZardSelectImports } from '../../../shared/components/select/select.imports';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DrawerComponent,
    ZardButtonComponent,
    ZardFormImports,
    ZardInputDirective,
    ZardSelectImports,
  ],
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.css'],
})
export class UserFormComponent implements OnInit, OnChanges {
  @Input() initialData?: User | null;
  @Input() isOpen = false;
  @Output() success = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  userForm!: FormGroup;
  roles: Role[] = [];
  isEditing = false;
  isSubmitting = false;
  imagePreview: string | null = null;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private rolesService: RolesService,
    private languageService: LanguageService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadRoles();
  }

  private async loadRoles(): Promise<void> {
    try {
      const res = await this.rolesService.getList();
      if (res?.result?.success && Array.isArray(res.data)) {
        this.roles = res.data;
        if (!this.isEditing && this.userForm) {
          const roleId = this.userForm.get('role_id')?.value;
          if (roleId === 'Operator' || roleId === 'operator') {
            const operatorRole = this.roles.find((r) => r.name?.toLowerCase() === 'operator');
            if (operatorRole) {
              this.userForm.patchValue({ role_id: operatorRole.id });
            }
          }
        }
      }
    } catch {
      this.roles = [];
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialData']) {
      this.isEditing = !!this.initialData;
      if (this.userForm) {
        this.initializeForm();
        this.loadUserData();
      }
    }
    if (changes['isOpen'] && this.isOpen && this.userForm) {
      this.loadUserData();
    }
    if (changes['isOpen'] && !changes['isOpen'].currentValue) {
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
      role_id: ['Operator', [Validators.required]],
      is_active: ['true', [Validators.required]],
    });

    if (!this.isEditing) {
      this.userForm.get('password')?.setValidators([Validators.required]);
    }
    this.loadUserData();
  }

  private loadUserData(): void {
    if (!this.initialData || !this.userForm) return;

    this.userForm.patchValue({
      id: this.initialData.id,
      email: this.initialData.email,
      first_name: this.initialData.first_name,
      last_name: this.initialData.last_name,
      password: '',
      role_id: this.initialData.role_id ?? this.initialData.role?.id ?? this.initialData.role?.name ?? 'Operator',
      is_active: this.initialData.is_active ? 'true' : 'false',
    });

    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.userForm.get(fieldName);
    if (field?.errors && (field.dirty || field.touched)) {
      if (field.errors['required']) {
        return this.t(`user_management.${fieldName === 'role_id' ? 'role' : fieldName}_required`);
      }
      if (field.errors['email']) {
        return this.t('user_management.invalid_email');
      }
    }
    return '';
  }

  onImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
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
      const formData = { ...this.userForm.value } as Record<string, unknown>;
      formData['is_active'] = formData['is_active'] === true || formData['is_active'] === 'true';

      if (this.isEditing && !formData['password']) {
        delete formData['password'];
      }

      if (!this.isEditing) {
        delete formData['id'];
        formData['auth_provider'] = 'local';
      }
      delete formData['role'];

      const response = this.isEditing && this.initialData
        ? await this.userService.update(this.initialData.id, formData)
        : await this.userService.create(formData);

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
    } catch (error: unknown) {
      const fallback = this.isEditing
        ? this.t('user_management.failed_update')
        : this.t('user_management.failed_create');
      const msg = getApiErrorMessage(error) || (error instanceof Error ? error.message : '');
      const errorMessage = String(msg).toLowerCase().includes('email') ? this.t('user_management.email_registered') : handleApiError(error, fallback);
      this.alertService.error(this.t('user_management.error'), errorMessage);
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
