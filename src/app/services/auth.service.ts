import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ApiResponse, AuthData, AuthState, LoginRequest, RegisterRequest, User } from '@app/models';
import { returnCompleteURI } from '@app/utils';
import { environment } from '@environment';
import { BehaviorSubject } from 'rxjs';
import { FetchService } from './extras/fetch.service';

const GATEWAY = '/auth';
export const AUTH_URL = returnCompleteURI({
	URI: environment.API.BASE,
	API_Gateway: GATEWAY,
});

@Injectable({
	providedIn: 'root',
})
export class AuthService {
	private readonly AUTH_STORAGE_KEY = 'auth_estock';

	// Auth state management
	private authStateSubject = new BehaviorSubject<AuthState>({
		user: null,
		token: null,
		isAuthenticated: false,
		isLoading: false,
		error: null
	});

	public authState$ = this.authStateSubject.asObservable();

	constructor(
		private fetchService: FetchService,
		private router: Router
	) {
		this.initializeAuthState();
	}

	/**
	 * @description Initialize auth state from localStorage
	 * @memberof AuthService
	 * @version 4.17.0.11
	 */
	private initializeAuthState(): void {
		const authData = this.getStoredAuthData();
		
		if (authData?.token) {
			try {
				const user = this.decodeTokenPayload(authData.token);
				this.updateAuthState({
					user,
					token: authData.token,
					isAuthenticated: true,
					isLoading: false,
					error: null
				});
			} catch (error) {
				this.clearAuthData();
			}
		}
	}

	/**
	 * @description Update auth state
	 * @param newState Partial auth state to update
	 * @memberof AuthService
	 * @version 4.17.0.11
	 */
	private updateAuthState(newState: Partial<AuthState>): void {
		const currentState = this.authStateSubject.value;
		this.authStateSubject.next({ ...currentState, ...newState });
	}

	/**
	 * @description Login user
	 * @param credentials Login credentials
	 * @returns Promise<ApiResponse<AuthData>>
	 * @memberof AuthService
	 * @version 4.17.0.11
	 */
	async login(credentials: LoginRequest): Promise<ApiResponse<AuthData>> {
		try {
			this.updateAuthState({ isLoading: true, error: null });

			const response = await this.fetchService.post<ApiResponse<AuthData>>({
				API_Gateway: `${AUTH_URL}/login`,
				values: credentials,
			});

			if (response.result.success) {
				this.handleAuthSuccess(response.data);
			}

			return response;
		} catch (error) {
			this.handleAuthError(error);
			throw error;
		}
	}

	/**
	 * @description Register new user
	 * @param userData Registration data
	 * @returns Promise<ApiResponse<AuthData>>
	 * @memberof AuthService
	 * @version 4.17.0.11
	 */
	async register(userData: RegisterRequest): Promise<ApiResponse<AuthData>> {
		try {
			this.updateAuthState({ isLoading: true, error: null });

			const response = await this.fetchService.post<ApiResponse<AuthData>>({
				API_Gateway: `${AUTH_URL}/register`,
				values: userData,
			});

			if (response.result.success) {
				this.handleAuthSuccess(response.data);
			}

			return response;
		} catch (error) {
			this.handleAuthError(error);
			throw error;
		}
	}

	/**
	 * @description Logout user
	 * @returns Promise<void>
	 * @memberof AuthService
	 * @version 4.17.0.11
	 */
	async logout(): Promise<void> {
		try {
			const authData = this.getStoredAuthData();
			
			if (authData?.token) {
				// Call logout endpoint
				await this.fetchService.post<ApiResponse<any>>({
					API_Gateway: `${AUTH_URL}/logout`,
					values: {},
				});
			}
		} catch (error) {
			// Continue with logout even if server call fails
			console.warn('Logout server call failed:', error);
		} finally {
			this.handleLogout();
		}
	}

	/**
	 * @description Get current user from auth state
	 * @returns User | null
	 * @memberof AuthService
	 * @version 4.17.0.11
	 */
	getCurrentUser(): User | null {
		return this.authStateSubject.value.user;
	}

	/**
	 * @description Get authentication status
	 * @returns boolean
	 * @memberof AuthService
	 * @version 4.17.0.11
	 */
	isAuthenticated(): boolean {
		return this.authStateSubject.value.isAuthenticated;
	}

	/**
	 * @description Get current token
	 * @returns string | null
	 * @memberof AuthService
	 * @version 4.17.0.11
	 */
	getToken(): string | null {
		const authData = this.getStoredAuthData();
		return authData?.token || null;
	}

	/**
	 * @description Check if user has specific role
	 * @param role Role to check
	 * @returns boolean
	 * @memberof AuthService
	 * @version 4.17.0.11
	 */
	hasRole(role: string): boolean {
		const currentState = this.authStateSubject.value;
		return currentState.user?.role === role;
	}

	/**
	 * @description Get stored auth data from localStorage
	 * @returns AuthData | null
	 * @memberof AuthService
	 * @version 4.17.0.11
	 */
	private getStoredAuthData(): AuthData | null {
		try {
			const stored = localStorage.getItem(this.AUTH_STORAGE_KEY);
			return stored ? JSON.parse(stored) : null;
		} catch (error) {
			console.error('Error parsing stored auth data:', error);
			return null;
		}
	}

	/**
	 * @description Decode JWT token payload
	 * @param token JWT token
	 * @returns User object
	 * @memberof AuthService
	 * @version 4.17.0.11
	 */
	private decodeTokenPayload(token: string): User {
		try {
			const payload = token.split('.')[1];
			const decoded = JSON.parse(atob(payload));
			
			return {
				user_id: decoded.user_id,
				user_name: decoded.user_name,
				email: decoded.email,
				role: decoded.role
			};
		} catch (error) {
			throw new Error('Invalid token format');
		}
	}

	/**
	 * @description Handle successful authentication
	 * @param authData Authentication data
	 * @memberof AuthService
	 * @version 4.17.0.11
	 */
	private handleAuthSuccess(authData: AuthData): void {
		// Store auth data in localStorage
		localStorage.setItem(this.AUTH_STORAGE_KEY, JSON.stringify(authData));

		// Decode user from token
		const user = this.decodeTokenPayload(authData.token);

		// Update auth state
		this.updateAuthState({
			user,
			token: authData.token,
			isAuthenticated: true,
			isLoading: false,
			error: null
		});

		// Navigate to dashboard or home
		this.router.navigate(['/dashboard']);
	}

	/**
	 * @description Handle authentication errors
	 * @param error Error object
	 * @memberof AuthService
	 * @version 4.17.0.11
	 */
	private handleAuthError(error: any): void {
		let errorMessage = 'An error occurred during authentication';

		if (error?.result?.message) {
			errorMessage = error.result.message;
		} else if (error?.message) {
			errorMessage = error.message;
		}

		this.updateAuthState({
			isLoading: false,
			error: errorMessage
		});
	}

	/**
	 * @description Handle logout
	 * @memberof AuthService
	 * @version 4.17.0.11
	 */
	private handleLogout(): void {
		this.clearAuthData();
		this.updateAuthState({
			user: null,
			token: null,
			isAuthenticated: false,
			isLoading: false,
			error: null
		});
		this.router.navigate(['/login']);
	}

	/**
	 * @description Clear authentication data
	 * @memberof AuthService
	 * @version 4.17.0.11
	 */
	private clearAuthData(): void {
		localStorage.removeItem(this.AUTH_STORAGE_KEY);
	}

	/**
	 * @description Update user profile
	 * @param userData User data to update
	 * @returns Promise<ApiResponse<User>>
	 * @memberof AuthService
	 * @version 4.17.0.11
	 */
	async updateProfile(userData: Partial<User>): Promise<ApiResponse<User>> {
		try {
			const response = await this.fetchService.patch<ApiResponse<User>>({
				API_Gateway: `${AUTH_URL}/profile`,
				values: userData,
			});

			if (response.result.success) {
				// Update stored auth data with new user info
				const authData = this.getStoredAuthData();
				if (authData) {
					const updatedUser = { ...this.getCurrentUser(), ...response.data };
					this.updateAuthState({ user: updatedUser });
				}
			}

			return response;
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @description Change password
	 * @param currentPassword Current password
	 * @param newPassword New password
	 * @returns Promise<ApiResponse<any>>
	 * @memberof AuthService
	 * @version 4.17.0.11
	 */
	async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<any>> {
		try {
			const response = await this.fetchService.post<ApiResponse<any>>({
				API_Gateway: `${AUTH_URL}/change-password`,
				values: {
					currentPassword,
					newPassword
				},
			});

			return response;
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @description Forgot password
	 * @param email Email address
	 * @returns Promise<ApiResponse<any>>
	 * @memberof AuthService
	 * @version 4.17.0.11
	 */
	async forgotPassword(email: string): Promise<ApiResponse<any>> {
		try {
			const response = await this.fetchService.post<ApiResponse<any>>({
				API_Gateway: `${AUTH_URL}/forgot-password`,
				values: { email },
			});

			return response;
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @description Reset password
	 * @param token Reset token
	 * @param newPassword New password
	 * @returns Promise<ApiResponse<any>>
	 * @memberof AuthService
	 * @version 4.17.0.11
	 */
	async resetPassword(token: string, newPassword: string): Promise<ApiResponse<any>> {
		try {
			const response = await this.fetchService.post<ApiResponse<any>>({
				API_Gateway: `${AUTH_URL}/reset-password`,
				values: {
					token,
					newPassword
				},
			});

			return response;
		} catch (error) {
			throw error;
		}
	}
}
