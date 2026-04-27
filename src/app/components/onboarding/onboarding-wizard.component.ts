import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { ArticleService } from '../../services/article.service';
import { AlertService } from '../../services/extras/alert.service';
import { LanguageService } from '../../services/extras/language.service';
import { AlertComponent } from '../shared/extras/alert/alert.component';
import { handleApiError } from '@app/utils';
import { AuthService } from '../../services/auth.service';
import { RolesService } from '../../services/roles.service';
import { Role } from '@app/models/role.model';

const STORAGE_KEY = 'onboarding_progress';

export interface OnboardingProgress {
  step: number;
  inviteData?: { email: string; first_name: string; last_name: string; role_id: string } | null;
  articleData?: { sku: string; name: string; presentation: string } | null;
}

@Component({
  selector: 'app-onboarding-wizard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AlertComponent],
  templateUrl: './onboarding-wizard.component.html',
  styleUrl: './onboarding-wizard.component.css',
})
export class OnboardingWizardComponent implements OnInit, OnDestroy {
  currentStep = signal(1);
  totalSteps = 3;
  isLoading = signal(false);

  inviteForm!: FormGroup;
  articleForm!: FormGroup;

  companyName = '';
  trialDaysLeft = 14;
  inviteSubmitted = false;
  articleSubmitted = false;

  // B3 fix S3.6: roles loaded from /api/roles for the step-2 select.
  // Default to the seeded "Operator" role id if present in the list.
  roles: Role[] = [];
  rolesLoading = false;
  private readonly DEFAULT_OPERATOR_ROLE_ID = 'Hw6PBkkS4ZCRWTjXGQHp';

  progress = computed(() => Math.round((this.currentStep() / this.totalSteps) * 100));

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private userService: UserService,
    private articleService: ArticleService,
    private alertService: AlertService,
    private languageService: LanguageService,
    private authService: AuthService,
    private rolesService: RolesService,
  ) {}

  ngOnInit(): void {
    this.initForms();
    this.loadProgress();
    this.loadUserInfo();
    this.loadRoles();
  }

  /** B3 fix S3.6: populate the role select. */
  private async loadRoles(): Promise<void> {
    this.rolesLoading = true;
    try {
      const resp = await this.rolesService.getList();
      if (resp?.result?.success) {
        this.roles = resp.data ?? [];
        // Apply default only if user has not already chosen / restored a role.
        const current = this.inviteForm.get('role_id')?.value;
        if (!current) {
          const operator = this.roles.find((r) => r.id === this.DEFAULT_OPERATOR_ROLE_ID);
          const fallback =
            operator ?? this.roles.find((r) => /operator/i.test(r.name)) ?? this.roles[0];
          if (fallback) {
            this.inviteForm.get('role_id')?.setValue(fallback.id);
          }
        }
      }
    } catch (_) {
      // Non-blocking: user can still type the role_id manually if the
      // /api/roles call fails (rare).
    } finally {
      this.rolesLoading = false;
    }
  }

  private initForms(): void {
    this.inviteForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      first_name: ['', [Validators.required]],
      last_name: ['', [Validators.required]],
      role_id: ['', [Validators.required]],
    });

    this.articleForm = this.fb.group({
      sku: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_-]{2,50}$/)]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      presentation: ['unit', [Validators.required]],
    });
  }

  private loadUserInfo(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.companyName = user.user_name || '';
    }
  }

  private loadProgress(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const progress: OnboardingProgress = JSON.parse(stored);
        this.currentStep.set(progress.step || 1);
        if (progress.inviteData) {
          this.inviteForm.patchValue(progress.inviteData);
        }
        if (progress.articleData) {
          this.articleForm.patchValue(progress.articleData);
        }
      }
    } catch {
      // ignore corrupted storage
    }
  }

  private saveProgress(): void {
    const progress: OnboardingProgress = {
      step: this.currentStep(),
      inviteData: this.inviteForm.valid ? this.inviteForm.value : null,
      articleData: this.articleForm.valid ? this.articleForm.value : null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }

  goNext(): void {
    if (this.currentStep() < this.totalSteps) {
      this.currentStep.update((s) => s + 1);
      this.saveProgress();
    }
  }

  goBack(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update((s) => s - 1);
      this.saveProgress();
    }
  }

  skipAll(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.router.navigate(['/dashboard']);
  }

  skipStep(): void {
    if (this.currentStep() < this.totalSteps) {
      this.goNext();
    } else {
      this.finish();
    }
  }

  async onInviteSubmit(): Promise<void> {
    if (this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    try {
      const payload = {
        ...this.inviteForm.value,
        is_active: true,
        auth_provider: 'local',
        password: this.generateTempPassword(),
      };
      await this.userService.create(payload);
      this.inviteSubmitted = true;
      this.alertService.success(this.t('onboarding.invite_success'));
      this.saveProgress();
      this.goNext();
    } catch (error: any) {
      this.alertService.error(handleApiError(error, this.t('onboarding.invite_error')));
    } finally {
      this.isLoading.set(false);
    }
  }

  async onArticleSubmit(): Promise<void> {
    if (this.articleForm.invalid) {
      this.articleForm.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    try {
      const payload = {
        ...this.articleForm.value,
        track_by_lot: false,
        track_by_serial: false,
        track_expiration: false,
        is_active: true,
      };
      await this.articleService.create(payload);
      this.articleSubmitted = true;
      this.alertService.success(this.t('onboarding.article_success'));
      this.saveProgress();
      this.finish();
    } catch (error: any) {
      this.alertService.error(handleApiError(error, this.t('onboarding.article_error')));
    } finally {
      this.isLoading.set(false);
    }
  }

  finish(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.router.navigate(['/dashboard']);
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  ngOnDestroy(): void {
    // Save state on navigation away
    this.saveProgress();
  }

  t(key: string): string {
    return this.languageService.t(key);
  }
}
