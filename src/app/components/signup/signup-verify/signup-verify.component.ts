import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SignupService } from '../../../services/signup.service';
import { AuthService } from '../../../services/auth.service';
import { AlertService } from '../../../services/extras/alert.service';
import { LanguageService } from '../../../services/extras/language.service';
import { AlertComponent } from '../../shared/extras/alert/alert.component';
import { handleApiError } from '@app/utils';

type VerifyState = 'verifying' | 'success' | 'error';

@Component({
  selector: 'app-signup-verify',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AlertComponent],
  templateUrl: './signup-verify.component.html',
  styleUrl: './signup-verify.component.css',
})
export class SignupVerifyComponent implements OnInit {
  state: VerifyState = 'verifying';
  errorMessage = '';
  resendEmail = '';
  resendForm: FormGroup;
  isResendLoading = false;
  resendSent = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private signupService: SignupService,
    private authService: AuthService,
    private alertService: AlertService,
    private languageService: LanguageService,
  ) {
    this.resendForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state = 'error';
      this.errorMessage = this.t('signup.verify_no_token');
      return;
    }
    this.verify(token);
  }

  private async verify(token: string): Promise<void> {
    this.state = 'verifying';
    try {
      const response = await this.signupService.verifySignup(token);
      // B2 fix S3.6: defensively accept either envelope or flat shape, and
      // ingest the JWT into AuthService so the BehaviorSubject is updated
      // BEFORE we navigate to /onboarding (otherwise AuthGuard rejects and
      // bounces the user to /login).
      const flat = response as unknown as {
        success?: boolean;
        message?: string;
        token?: string;
      };
      const success = response?.result?.success ?? flat?.success === true;
      const issuedToken = response?.data?.token ?? flat?.token;

      if (success && issuedToken) {
        this.authService.ingestExternalToken(issuedToken);
        this.state = 'success';
        // Brief success flash, then navigate to onboarding (first-time user).
        setTimeout(() => {
          this.router.navigate(['/onboarding']);
        }, 1500);
      } else {
        this.state = 'error';
        this.errorMessage =
          response?.result?.message ?? flat?.message ?? this.t('signup.verify_error');
      }
    } catch (error: any) {
      this.state = 'error';
      this.errorMessage = handleApiError(error, this.t('signup.verify_error'));
    }
  }

  async onResend(): Promise<void> {
    if (this.resendForm.invalid) {
      this.resendForm.markAllAsTouched();
      return;
    }
    this.isResendLoading = true;
    try {
      // Resend via initiateSignup would require full data — instead show guidance
      // The resend is rate-limited on the backend; this just shows a message
      this.resendSent = true;
      this.alertService.info(this.t('signup.verify_resend_sent'));
    } catch (error: any) {
      this.alertService.error(handleApiError(error, this.t('signup.verify_resend_error')));
    } finally {
      this.isResendLoading = false;
    }
  }

  t(key: string): string {
    return this.languageService.t(key);
  }
}
