import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { SidebarStore, NotificationStore } from '../../../core/stores';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: 'notifications';
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, NgIcon],
  template: `
    <aside
      class="h-full flex flex-col bg-gray-900 text-white shadow-2xl transition-all duration-300 z-50"
      [style.width.px]="sidebarStore.isExpanded() ? 240 : 64"
    >
      <!-- Header con Logo y Toggle -->
      <div class="p-4 flex items-center justify-between border-b border-gray-800">
        <div class="flex items-center gap-3" [class.justify-center]="!sidebarStore.isExpanded()">
          <!-- Logo -->
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center flex-shrink-0">
            <span class="text-white font-bold text-sm">PW</span>
          </div>
          @if (sidebarStore.isExpanded()) {
            <div class="overflow-hidden">
              <div class="font-semibold text-sm text-white truncate">Panel Waze</div>
              <div class="text-xs text-gray-400 truncate">Monitoreados</div>
            </div>
          }
        </div>
        
        <!-- Toggle Button -->
        <button
          (click)="sidebarStore.toggle()"
          class="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          [attr.aria-label]="sidebarStore.isExpanded() ? 'Colapsar menú' : 'Expandir menú'"
        >
          <ng-icon 
            [name]="sidebarStore.isExpanded() ? 'lucideX' : 'lucideMenu'" 
            class="text-gray-400" 
            size="18" 
          />
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        @for (item of navItems; track item.id) {
          <a
            [routerLink]="item.path"
            routerLinkActive="nav-item-active"
            [routerLinkActiveOptions]="{ exact: item.path === '/dashboard' }"
            class="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-200 relative"
            [class.justify-center]="!sidebarStore.isExpanded()"
            [attr.title]="!sidebarStore.isExpanded() ? item.label : null"
          >
            <!-- Icon -->
            <ng-icon [name]="item.icon" class="flex-shrink-0" size="20" />
            
            <!-- Label -->
            @if (sidebarStore.isExpanded()) {
              <span class="flex-1 text-sm truncate">{{ item.label }}</span>
              
              <!-- Notification Badge -->
              @if (item.badge === 'notifications' && notificationStore.unreadCount() > 0) {
                <span class="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                  {{ notificationStore.unreadCount() > 99 ? '99+' : notificationStore.unreadCount() }}
                </span>
              }
              
              <!-- Active Chevron -->
              <ng-icon name="lucideChevronRight" class="text-white opacity-0 group-[.nav-item-active]:opacity-100" size="16" />
            } @else {
              <!-- Dot indicator for collapsed -->
              @if (item.badge === 'notifications' && notificationStore.unreadCount() > 0) {
                <span class="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-gray-900"></span>
              }
            }
          </a>
        }
      </nav>

      <!-- Footer -->
      @if (sidebarStore.isExpanded()) {
        <div class="p-4 border-t border-gray-800">
          <div class="text-xs text-gray-500 text-center">
            v1.0.0 • Panel Waze
          </div>
        </div>
      }
    </aside>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .nav-item-active {
      background-color: rgb(37 99 235) !important;
      color: white !important;
      box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
    }

    .nav-item-active ng-icon {
      color: white !important;
    }
  `],
})
export class SidebarComponent {
  readonly sidebarStore = inject(SidebarStore);
  readonly notificationStore = inject(NotificationStore);

  readonly navItems: NavItem[] = [
    { id: 'home', label: 'Inicio', icon: 'lucideHome', path: '/dashboard' },
    { id: 'map', label: 'Mapa y Zonas', icon: 'lucideMap', path: '/mapa' },
    { id: 'risk', label: 'Análisis de Riesgos', icon: 'lucideAlertTriangle', path: '/riesgos' },
    { id: 'alerts', label: 'Alertas y Eventos', icon: 'lucideLayers', path: '/alertas' },
    { id: 'notifications', label: 'Notificaciones', icon: 'lucideBell', path: '/notificaciones', badge: 'notifications' },
    { id: 'accidents', label: 'Siniestros Viales', icon: 'lucideCar', path: '/siniestros' },
    { id: 'incidents', label: 'Módulo Incidentes', icon: 'lucideFileSearch', path: '/incidentes' },
    { id: 'history', label: 'Historial', icon: 'lucideCalendar', path: '/historial' },
    { id: 'stats', label: 'Estadísticas', icon: 'lucideBarChart3', path: '/estadisticas' },
    { id: 'admin', label: 'Administración', icon: 'lucideSettings', path: '/admin' },
  ];
}
