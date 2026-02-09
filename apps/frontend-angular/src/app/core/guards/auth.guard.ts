import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Guardar URL intentada para redireccionar después del login
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

export const publicGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  // Si ya está autenticado, redirigir al dashboard
  router.navigate(['/dashboard']);
  return false;
};

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      router.navigate(['/login']);
      return false;
    }

    const userRole = authService.userRole();
    if (allowedRoles.includes(userRole) || userRole === 'admin') {
      return true;
    }

    // Sin permisos, redirigir al dashboard
    router.navigate(['/dashboard']);
    return false;
  };
};

export const permissionGuard = (requiredPermission: string): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      router.navigate(['/login']);
      return false;
    }

    if (authService.hasPermission(requiredPermission)) {
      return true;
    }

    // Sin permisos, redirigir al dashboard
    router.navigate(['/dashboard']);
    return false;
  };
};
