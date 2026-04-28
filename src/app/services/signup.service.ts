import { Injectable } from '@angular/core';
import { ApiResponse, Permission } from '@app/models';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

export interface SignupRequest {
  email: string;
  company_name: string;
  tenant_slug: string;
  admin_name: string;
  admin_password: string;
  // S3.7 W3 (B23): opt-in flag to load demo/sample data on tenant provisioning.
  // Default false on the frontend so new tenants start clean unless the user
  // explicitly checks the "load sample data" box on signup.
  // NOTE: backend handling (conditional SeedFarma run inside SignupRepository.VerifySignup)
  // is deferred to S3.7 backend-companion sprint. Frontend forwards the flag so
  // the backend can act on it once the column lands.
  seed_demo_data?: boolean;
}

export interface SignupVerifyResponse {
  token: string;
  tenant_id: string;
  email: string;
  name: string;
  // S3.6.1: backend (S3.5.6) now enriches verify response with role+permissions
  // so the frontend can hydrate AuthService without a second /auth/me round-trip.
  role?: string;
  permissions?: Permission;
  last_name?: string;
}

const GATEWAY = '/signup';
export const SIGNUP_URL = returnCompleteURI({
  URI: environment.API.BASE,
  API_Gateway: GATEWAY,
});

@Injectable({
  providedIn: 'root',
})
export class SignupService {
  constructor(private fetchService: FetchService) {}

  /**
   * @description Initiate tenant self-service signup
   * @param payload Signup request payload
   * @returns Promise<ApiResponse<{message: string}>>
   */
  async initiateSignup(payload: SignupRequest): Promise<ApiResponse<{ message: string }>> {
    return await this.fetchService.post<ApiResponse<{ message: string }>>({
      API_Gateway: `${SIGNUP_URL}`,
      values: payload,
    });
  }

  /**
   * @description Verify signup email token and receive JWT
   * @param token Verification token from email
   * @returns Promise<ApiResponse<SignupVerifyResponse>>
   */
  async verifySignup(token: string): Promise<ApiResponse<SignupVerifyResponse>> {
    return await this.fetchService.post<ApiResponse<SignupVerifyResponse>>({
      API_Gateway: `${SIGNUP_URL}/verify`,
      values: { token },
    });
  }
}
