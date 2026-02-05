/**
 * AdminComponent - Panel de administración
 * Equivalente a: apps/frontend/src/pages/admin/AdminPage.tsx
 */
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TTSConfigComponent } from './tts-config/tts-config.component';

type AdminSection = 'menu' | 'tts' | 'catalog' | 'polygons' | 'system';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, TTSConfigComponent],
  template: `
    <div class="space-y-6">
      <!-- Breadcrumb -->
      @if (activeSection() !== 'menu') {
        <button
          (click)="activeSection.set('menu')"
          class="flex items-center gap-2 text-[var(--secondary)] hover:text-[var(--foreground)] transition-colors"
        >
          ← Volver al menú
        </button>
      }

      <h2 class="text-2xl font-bold">
        {{ getTitle() }}
      </h2>

      @switch (activeSection()) {
        @case ('menu') {
          <!-- Menú principal -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Catálogo de incidentes -->
            <div
              class="bg-[var(--card)] p-6 rounded-lg border border-[var(--border)] cursor-pointer hover:border-[var(--primary)] transition-colors"
              (click)="activeSection.set('catalog')"
            >
              <h3 class="text-lg font-semibold mb-4">📋 Catálogo de Incidentes</h3>
              <p class="text-[var(--secondary)] mb-4">
                Gestionar tipos y subtipos de incidentes Waze
              </p>
              <span class="text-[var(--primary)]">Administrar →</span>
            </div>

            <!-- Configuración TTS -->
            <div
              class="bg-[var(--card)] p-6 rounded-lg border border-[var(--border)] cursor-pointer hover:border-[var(--primary)] transition-colors"
              (click)="activeSection.set('tts')"
            >
              <h3 class="text-lg font-semibold mb-4">🔊 Configuración TTS</h3>
              <p class="text-[var(--secondary)] mb-4">
                Ajustar voz, velocidad y filtros de notificaciones
              </p>
              <span class="text-[var(--primary)]">Configurar →</span>
            </div>

            <!-- Polígonos -->
            <div
              class="bg-[var(--card)] p-6 rounded-lg border border-[var(--border)] cursor-pointer hover:border-[var(--primary)] transition-colors"
              (click)="activeSection.set('polygons')"
            >
              <h3 class="text-lg font-semibold mb-4">🗺️ Polígonos</h3>
              <p class="text-[var(--secondary)] mb-4">Gestionar corredores viales monitoreados</p>
              <span class="text-[var(--primary)]">Ver polígonos →</span>
            </div>

            <!-- Sistema -->
            <div
              class="bg-[var(--card)] p-6 rounded-lg border border-[var(--border)] cursor-pointer hover:border-[var(--primary)] transition-colors"
              (click)="activeSection.set('system')"
            >
              <h3 class="text-lg font-semibold mb-4">⚙️ Sistema</h3>
              <p class="text-[var(--secondary)] mb-4">Health checks y estado del backend</p>
              <span class="text-[var(--primary)]">Ver estado →</span>
            </div>
          </div>
        }

        @case ('tts') {
          <app-tts-config />
        }

        @case ('catalog') {
          <div class="bg-[var(--card)] p-6 rounded-lg border border-[var(--border)]">
            <h3 class="text-lg font-semibold mb-4">📋 Catálogo de Incidentes</h3>
            <p class="text-[var(--secondary)]">Componente de catálogo pendiente de migración.</p>
          </div>
        }

        @case ('polygons') {
          <div class="bg-[var(--card)] p-6 rounded-lg border border-[var(--border)]">
            <h3 class="text-lg font-semibold mb-4">🗺️ Gestión de Polígonos</h3>
            <p class="text-[var(--secondary)]">Componente de polígonos pendiente de migración.</p>
          </div>
        }

        @case ('system') {
          <div class="bg-[var(--card)] p-6 rounded-lg border border-[var(--border)]">
            <h3 class="text-lg font-semibold mb-4">⚙️ Estado del Sistema</h3>
            <p class="text-[var(--secondary)]">Componente de sistema pendiente de migración.</p>
          </div>
        }
      }
    </div>
  `,
})
export class AdminComponent {
  readonly activeSection = signal<AdminSection>('menu');

  getTitle(): string {
    switch (this.activeSection()) {
      case 'tts':
        return 'Configuración TTS';
      case 'catalog':
        return 'Catálogo de Incidentes';
      case 'polygons':
        return 'Gestión de Polígonos';
      case 'system':
        return 'Estado del Sistema';
      default:
        return 'Administración';
    }
  }
}
