import { Injectable } from '@angular/core';
import { ApiResponse } from '@app/models';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { FetchService } from './extras/fetch.service';

export interface SignupRequest {
  email: string;
  company_name: string;
  tenant_slug: string;
  admin_name: string;
  admin_password: string;
}

export interface SignupVerifyResponse {
  token: string;
  tenant_id: string;
  email: string;
  name: string;
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
