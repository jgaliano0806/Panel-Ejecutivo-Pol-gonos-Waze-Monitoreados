/**
 * AccidentsComponent - Historial de siniestros viales
 * Placeholder para migración completa
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-accidents',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <h2 class="text-2xl font-bold">Siniestros Viales</h2>
      <p class="text-[var(--secondary)]">Historial y análisis de accidentes</p>

      <!-- Info -->
      <div
        class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
      >
        <h3 class="font-semibold text-blue-800 dark:text-blue-200">🚗 Módulo en desarrollo</h3>
        <p class="text-sm text-blue-700 dark:text-blue-300 mt-1">
          El historial de siniestros con filtros y estadísticas estará disponible próximamente.
        </p>
      </div>
    </div>
  `,
})
export class AccidentsComponent {}
