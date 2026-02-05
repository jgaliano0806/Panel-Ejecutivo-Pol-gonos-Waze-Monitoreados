import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <h2 class="text-2xl font-bold">Administración</h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Catálogo de incidentes -->
        <div class="bg-[var(--card)] p-6 rounded-lg border border-[var(--border)]">
          <h3 class="text-lg font-semibold mb-4">📋 Catálogo de Incidentes</h3>
          <p class="text-[var(--secondary)] mb-4">Gestionar tipos y subtipos de incidentes Waze</p>
          <button class="px-4 py-2 bg-[var(--primary)] text-white rounded hover:opacity-90">
            Administrar
          </button>
        </div>

        <!-- Configuración TTS -->
        <div class="bg-[var(--card)] p-6 rounded-lg border border-[var(--border)]">
          <h3 class="text-lg font-semibold mb-4">🔊 Configuración TTS</h3>
          <p class="text-[var(--secondary)] mb-4">
            Ajustar voz, velocidad y filtros de notificaciones
          </p>
          <button class="px-4 py-2 bg-[var(--primary)] text-white rounded hover:opacity-90">
            Configurar
          </button>
        </div>

        <!-- Polígonos -->
        <div class="bg-[var(--card)] p-6 rounded-lg border border-[var(--border)]">
          <h3 class="text-lg font-semibold mb-4">🗺️ Polígonos</h3>
          <p class="text-[var(--secondary)] mb-4">Gestionar corredores viales monitoreados</p>
          <button class="px-4 py-2 bg-[var(--primary)] text-white rounded hover:opacity-90">
            Ver polígonos
          </button>
        </div>

        <!-- Sistema -->
        <div class="bg-[var(--card)] p-6 rounded-lg border border-[var(--border)]">
          <h3 class="text-lg font-semibold mb-4">⚙️ Sistema</h3>
          <p class="text-[var(--secondary)] mb-4">Health checks y estado del backend</p>
          <button class="px-4 py-2 bg-[var(--primary)] text-white rounded hover:opacity-90">
            Ver estado
          </button>
        </div>
      </div>
    </div>
  `,
})
export class AdminComponent {}
