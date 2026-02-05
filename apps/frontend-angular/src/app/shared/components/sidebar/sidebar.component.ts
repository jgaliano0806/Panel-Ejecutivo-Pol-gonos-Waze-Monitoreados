/**
 * SidebarComponent - Barra lateral de navegación
 * Equivalente a: apps/frontend/src/components/layout/AppSidebar.tsx
 */
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { SidebarStore, NotificationStore } from '../../../core/stores';

interface NavItem {
  id: string;
  label: string;
  icon: string; // Emoji icons para simplicidad
  path: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside
      class="h-full flex flex-col bg-gray-900 text-white shadow-xl border-r border-gray-800 transition-all duration-300 z-50"
      [style.width.px]="sidebarStore.isExpanded() ? 240 : 64"
    >
      <!-- Header -->
      <div class="p-4 border-b border-gray-800 flex items-center justify-between">
        @if (sidebarStore.isExpanded()) {
          <div class="flex items-center gap-2">
            <div
              class="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center"
            >
              <span class="text-white font-bold text-sm">PW</span>
            </div>
            <div>
              <div class="font-bold text-sm">Panel Ejecutivo</div>
              <div class="text-xs text-gray-400">Waze Monitoreados</div>
            </div>
          </div>
        }
        <button
          (click)="sidebarStore.toggle()"
          class="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          [attr.aria-label]="sidebarStore.isExpanded() ? 'Colapsar sidebar' : 'Expandir sidebar'"
        >
          {{ sidebarStore.isExpanded() ? '✕' : '☰' }}
        </button>
      </div>

      <!-- Navigation Items -->
      <nav class="flex-1 overflow-y-auto p-2 mt-2">
        @for (item of navItems; track item.id) {
          <a
            [routerLink]="item.path"
            routerLinkActive="active-nav-item"
            [routerLinkActiveOptions]="{ exact: item.path === '/' || item.path === '/dashboard' }"
            class="w-full flex items-center gap-3 px-3 py-3 rounded-lg mb-1 relative transition-all duration-200 hover:bg-gray-800 text-gray-300 hover:text-white"
            [class.justify-center]="!sidebarStore.isExpanded()"
          >
            <span class="text-lg">{{ item.icon }}</span>

            @if (sidebarStore.isExpanded()) {
              <span class="flex-1 text-left text-sm font-medium">{{ item.label }}</span>

              <!-- Badge de notificaciones -->
              @if (item.id === 'notifications' && notificationStore.unreadCount() > 0) {
                <span
                  class="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center"
                >
                  {{
                    notificationStore.unreadCount() > 99 ? '99+' : notificationStore.unreadCount()
                  }}
                </span>
              }
            } @else {
              <!-- Dot indicator para collapsed -->
              @if (item.id === 'notifications' && notificationStore.unreadCount() > 0) {
                <span
                  class="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-gray-900"
                ></span>
              }
            }
          </a>
        }
      </nav>

      <!-- Footer -->
      @if (sidebarStore.isExpanded()) {
        <div class="p-4 border-t border-gray-800">
          <div class="text-xs text-gray-500 text-center">v1.0.0 • Panel Waze Angular</div>
        </div>
      }
    </aside>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }

      .active-nav-item {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        color: white !important;
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
      }
    `,
  ],
})
export class SidebarComponent {
  readonly sidebarStore = inject(SidebarStore);
  readonly notificationStore = inject(NotificationStore);

  readonly navItems: NavItem[] = [
    { id: 'home', label: 'Inicio', icon: '🏠', path: '/dashboard' },
    { id: 'map', label: 'Mapa y Zonas', icon: '🗺️', path: '/mapa' },
    { id: 'risk', label: 'Análisis de Riesgos', icon: '⚠️', path: '/riesgos' },
    { id: 'alerts', label: 'Alertas y Eventos', icon: '📊', path: '/alertas' },
    { id: 'notifications', label: 'Notificaciones', icon: '🔔', path: '/notificaciones' },
    { id: 'accidents', label: 'Siniestros Viales', icon: '🚗', path: '/siniestros' },
    { id: 'incidents', label: 'Módulo Incidentes', icon: '🔍', path: '/incidentes' },
    { id: 'history', label: 'Historial', icon: '📅', path: '/historial' },
    { id: 'stats', label: 'Estadísticas', icon: '📈', path: '/estadisticas' },
    { id: 'admin', label: 'Administración', icon: '⚙️', path: '/admin' },
  ];
}
