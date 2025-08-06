import { Injectable } from '@angular/core';

export interface AuthData {
  token: string;
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    is_active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthorizationService {
  
  private readonly STORAGE_KEY = 'auth_estock';

  private getAuthData(): AuthData | null {
    try {
      const authData = localStorage.getItem(this.STORAGE_KEY);
      if (!authData) return null;
      
      return JSON.parse(authData);
    } catch (error) {
      console.error('Error parsing auth data:', error);
      return null;
    }
  }

  /**
   * Obtiene el rol del usuario actual
   */
  getCurrentUserRole(): string | null {
    const authData = this.getAuthData();
    return authData?.role || null;
  }

  /**
   * Obtiene los datos del usuario actual
   */
  getCurrentUser() {
    const authData = this.getAuthData();
    return authData || null;
  }

  /**
   * Verifica si el usuario es administrador
   */
  isAdmin(): boolean {
    return this.getCurrentUserRole() === 'admin';
  }

  /**
   * Verifica si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    const authData = this.getAuthData();
    return !!(authData?.token && authData);
  }
}
