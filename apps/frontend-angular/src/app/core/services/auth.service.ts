/**
 * Servicio de Autenticación para Angular
 * Soporta login local, Microsoft SSO y Google OAuth
 */
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, catchError, tap, map, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  permissions: string[];
  polygons: string[];
  avatar?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  user: User;
  token: string;
  expiresIn: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiBase = environment.apiUrl;

  // Estado reactivo
  private _user = signal<User | null>(null);
  private _token = signal<string | null>(null);
  private _isLoading = signal(false);

  // Computed públicos
  readonly user = computed(() => this._user());
  readonly token = computed(() => this._token());
  readonly isAuthenticated = computed(() => !!this._token() && !!this._user());
  readonly isLoading = computed(() => this._isLoading());

  // Permisos del usuario
  readonly permissions = computed(() => this._user()?.permissions || []);
  readonly userRole = computed(() => this._user()?.role || '');
  readonly userPolygons = computed(() => this._user()?.polygons || []);

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Cargar datos de sesión desde localStorage
   */
  private loadFromStorage(): void {
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('auth_user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        this._token.set(token);
        this._user.set(user);
        console.log('🔐 Session restored for:', user.name);
      } catch (e) {
        this.clearStorage();
      }
    }
  }

  /**
   * Guardar datos de sesión en localStorage
   */
  private saveToStorage(token: string, user: User): void {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }

  /**
   * Limpiar datos de sesión
   */
  private clearStorage(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

  /**
   * Login con credenciales
   */
  login(credentials: LoginCredentials): Observable<boolean> {
    this._isLoading.set(true);

    return this.http.post<LoginResponse>(`${this.apiBase}/auth/login`, credentials).pipe(
      tap((response) => {
        this._token.set(response.token);
        this._user.set(response.user);
        this.saveToStorage(response.token, response.user);
        console.log('✅ Login successful:', response.user.name);
      }),
      map(() => true),
      catchError((error) => {
        console.error('❌ Login failed:', error);
        return of(false);
      }),
      tap(() => this._isLoading.set(false)),
    );
  }

  /**
   * Login simulado (para desarrollo)
   */
  loginMock(username: string, password: string): boolean {
    // Usuarios de prueba
    const mockUsers: Record<string, User> = {
      admin: {
        id: '1',
        name: 'Administrador',
        username: 'admin',
        email: 'admin@casisa.com.ar',
        role: 'admin',
        permissions: ['all'],
        polygons: [],
      },
      supervisor: {
        id: '2',
        name: 'Supervisor Demo',
        username: 'supervisor',
        email: 'supervisor@casisa.com.ar',
        role: 'supervisor',
        permissions: ['view', 'edit', 'manage_users', 'manage_polygons'],
        polygons: ['P001', 'P002'],
      },
      operator: {
        id: '3',
        name: 'Operador Demo',
        username: 'operator',
        email: 'operator@casisa.com.ar',
        role: 'operator',
        permissions: ['view', 'edit', 'manage_incidents'],
        polygons: ['P001'],
      },
    };

    const user = mockUsers[username];
    if (user && password === 'demo123') {
      const token = 'mock_token_' + Date.now();
      this._token.set(token);
      this._user.set(user);
      this.saveToStorage(token, user);
      console.log('✅ Mock login successful:', user.name);
      return true;
    }

    return false;
  }

  /**
   * Logout
   */
  logout(): void {
    this._user.set(null);
    this._token.set(null);
    this.clearStorage();
    console.log('👋 Logged out');
    this.router.navigate(['/login']);
  }

  /**
   * Verificar si el usuario tiene un permiso específico
   */
  hasPermission(permission: string): boolean {
    const perms = this.permissions();
    return perms.includes('all') || perms.includes(permission);
  }

  /**
   * Verificar si el usuario tiene alguno de los permisos
   */
  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some((p) => this.hasPermission(p));
  }

  /**
   * Verificar si el usuario tiene todos los permisos
   */
  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every((p) => this.hasPermission(p));
  }

  /**
   * Verificar si el usuario tiene un rol específico
   */
  hasRole(role: string): boolean {
    return this.userRole() === role;
  }

  /**
   * Verificar si el usuario tiene acceso a un polígono
   */
  hasPolygonAccess(polygonId: string): boolean {
    const user = this._user();
    if (!user) return false;
    if (user.role === 'admin' || user.polygons.length === 0) return true;
    return user.polygons.includes(polygonId);
  }

  // ============================================
  // SSO Methods (Microsoft & Google)
  // ============================================

  /**
   * Iniciar login con Microsoft SSO
   */
  loginWithMicrosoft(): void {
    // Redirect to Microsoft OAuth endpoint
    const clientId = environment.sso?.microsoft?.clientId || '';
    const tenantId = environment.sso?.microsoft?.tenantId || 'common';
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback/microsoft');
    const scope = encodeURIComponent('openid profile email');

    const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
      `client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}`;

    console.log('🔷 Redirecting to Microsoft login...');
    window.location.href = authUrl;
  }

  /**
   * Iniciar login con Google OAuth
   */
  loginWithGoogle(): void {
    // Redirect to Google OAuth endpoint
    const clientId = environment.sso?.google?.clientId || '';
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback/google');
    const scope = encodeURIComponent('openid profile email');

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}`;

    console.log('🔴 Redirecting to Google login...');
    window.location.href = authUrl;
  }

  /**
   * Manejar callback de SSO
   */
  handleSSOCallback(provider: 'microsoft' | 'google', code: string): Observable<boolean> {
    this._isLoading.set(true);

    return this.http.post<LoginResponse>(`${this.apiBase}/auth/sso/${provider}/callback`, { code }).pipe(
      tap((response) => {
        this._token.set(response.token);
        this._user.set(response.user);
        this.saveToStorage(response.token, response.user);
        console.log(`✅ SSO login (${provider}) successful:`, response.user.name);
      }),
      map(() => true),
      catchError((error) => {
        console.error(`❌ SSO login (${provider}) failed:`, error);
        return of(false);
      }),
      tap(() => this._isLoading.set(false)),
    );
  }

  /**
   * Refrescar token
   */
  refreshToken(): Observable<boolean> {
    const currentToken = this._token();
    if (!currentToken) return of(false);

    return this.http.post<LoginResponse>(`${this.apiBase}/auth/refresh`, { token: currentToken }).pipe(
      tap((response) => {
        this._token.set(response.token);
        this._user.set(response.user);
        this.saveToStorage(response.token, response.user);
      }),
      map(() => true),
      catchError(() => {
        this.logout();
        return of(false);
      }),
    );
  }

  /**
   * Obtener headers de autorización
   */
  getAuthHeaders(): { Authorization: string } | {} {
    const token = this._token();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }
}
