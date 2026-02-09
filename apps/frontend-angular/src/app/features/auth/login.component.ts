import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { AuthService } from '../../core/services';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <!-- Background Pattern -->
      <div class="absolute inset-0 opacity-50" style="background-image: url('data:image/svg+xml,<svg width=&quot;60&quot; height=&quot;60&quot; viewBox=&quot;0 0 60 60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;><g fill=&quot;none&quot; fill-rule=&quot;evenodd&quot;><g fill=&quot;%23ffffff&quot; fill-opacity=&quot;0.03&quot;><path d=&quot;M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z&quot;/></g></g></svg>')"></div>

      <div class="relative w-full max-w-md">
        <!-- Logo y Título -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-2xl mb-4">
            <ng-icon name="lucideRadio" class="text-white" size="40" />
          </div>
          <h1 class="text-3xl font-bold text-white">Panel Waze</h1>
          <p class="text-blue-200 mt-2">Monitoreo Inteligente de Tráfico</p>
          <p class="text-xs text-gray-400 mt-1">Caminos de las Sierras S.A.</p>
        </div>

        <!-- Login Card -->
        <div class="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
          <!-- Error Message -->
          @if (error()) {
            <div class="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-200">
              <ng-icon name="lucideAlertCircle" size="20" />
              <span class="text-sm">{{ error() }}</span>
            </div>
          }

          <!-- Login Form -->
          <form (ngSubmit)="onSubmit()" class="space-y-5">
            <div>
              <label class="text-sm text-gray-300 mb-2 block">Usuario</label>
              <div class="relative">
                <ng-icon name="lucideUser" class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size="18" />
                <input
                  type="text"
                  [(ngModel)]="username"
                  name="username"
                  placeholder="Ingrese su usuario"
                  autocomplete="username"
                  class="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label class="text-sm text-gray-300 mb-2 block">Contraseña</label>
              <div class="relative">
                <ng-icon name="lucideLock" class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size="18" />
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  [(ngModel)]="password"
                  name="password"
                  placeholder="••••••••"
                  autocomplete="current-password"
                  class="w-full pl-12 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
                <button
                  type="button"
                  (click)="togglePassword()"
                  class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  <ng-icon [name]="showPassword() ? 'lucideEyeOff' : 'lucideEye'" size="18" />
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  [(ngModel)]="remember"
                  name="remember"
                  class="w-4 h-4 rounded border-white/30 bg-white/10"
                />
                <span class="text-sm text-gray-300">Recordarme</span>
              </label>
              <a href="#" class="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                ¿Olvidó su contraseña?
              </a>
            </div>

            <button
              type="submit"
              [disabled]="isLoading()"
              class="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              @if (isLoading()) {
                <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Iniciando sesión...</span>
              } @else {
                <ng-icon name="lucideLogIn" size="18" />
                <span>Iniciar Sesión</span>
              }
            </button>
          </form>

          <!-- Divider -->
          <div class="relative my-8">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-white/20"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-4 bg-transparent text-gray-400">O continuar con</span>
            </div>
          </div>

          <!-- SSO Buttons -->
          <div class="grid grid-cols-2 gap-4">
            <button
              type="button"
              (click)="loginWithMicrosoft()"
              class="flex items-center justify-center gap-3 py-3 bg-[#0078d4] hover:bg-[#0066b8] text-white rounded-xl transition-colors"
            >
              <svg class="w-5 h-5" viewBox="0 0 21 21" fill="currentColor">
                <rect width="9" height="9"/>
                <rect x="11" width="9" height="9"/>
                <rect y="11" width="9" height="9"/>
                <rect x="11" y="11" width="9" height="9"/>
              </svg>
              <span class="font-medium">Microsoft</span>
            </button>

            <button
              type="button"
              (click)="loginWithGoogle()"
              class="flex items-center justify-center gap-3 py-3 bg-white hover:bg-gray-100 text-gray-700 rounded-xl transition-colors"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span class="font-medium">Google</span>
            </button>
          </div>
        </div>

        <!-- Demo Credentials -->
        <div class="mt-6 p-4 bg-white/5 backdrop-blur rounded-xl border border-white/10">
          <div class="text-xs text-gray-400 text-center mb-2">Credenciales de Demo</div>
          <div class="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              (click)="fillDemo('admin')"
              class="py-2 px-3 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              Admin
            </button>
            <button
              type="button"
              (click)="fillDemo('supervisor')"
              class="py-2 px-3 bg-amber-500/20 text-amber-300 rounded-lg hover:bg-amber-500/30 transition-colors"
            >
              Supervisor
            </button>
            <button
              type="button"
              (click)="fillDemo('operator')"
              class="py-2 px-3 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors"
            >
              Operador
            </button>
          </div>
          <div class="text-[10px] text-gray-500 text-center mt-2">Contraseña: demo123</div>
        </div>

        <!-- Footer -->
        <div class="mt-8 text-center text-xs text-gray-500">
          <p>© 2026 Caminos de las Sierras S.A. • Desarrollado por GED</p>
          <p class="mt-1">Panel Waze v2.0 • Monitoreo Inteligente</p>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  remember = false;

  readonly showPassword = signal(false);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  onSubmit(): void {
    if (!this.username || !this.password) {
      this.error.set('Por favor complete todos los campos');
      return;
    }

    this.error.set(null);
    this.isLoading.set(true);

    // Usar login mock para desarrollo
    setTimeout(() => {
      const success = this.authService.loginMock(this.username, this.password);
      this.isLoading.set(false);

      if (success) {
        this.router.navigate(['/dashboard']);
      } else {
        this.error.set('Usuario o contraseña incorrectos');
      }
    }, 1000);
  }

  loginWithMicrosoft(): void {
    this.authService.loginWithMicrosoft();
  }

  loginWithGoogle(): void {
    this.authService.loginWithGoogle();
  }

  fillDemo(role: 'admin' | 'supervisor' | 'operator'): void {
    this.username = role;
    this.password = 'demo123';
  }
}
