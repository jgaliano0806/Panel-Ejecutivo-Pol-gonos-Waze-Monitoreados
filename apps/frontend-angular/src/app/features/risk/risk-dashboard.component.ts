/**
 * RiskDashboardComponent - Análisis de riesgos
 * Placeholder para migración completa
 */
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services';

@Component({
  selector: 'app-risk-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <h2 class="text-2xl font-bold">Análisis de Riesgos</h2>
      <p class="text-[var(--secondary)]">Panel de análisis predictivo de riesgos viales</p>

      <!-- Placeholder KPIs -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-[var(--card)] p-6 rounded-lg border border-[var(--border)]">
          <div class="text-4xl font-bold text-red-500">--</div>
          <div class="text-sm text-[var(--secondary)] mt-1">Riesgo Alto</div>
        </div>
        <div class="bg-[var(--card)] p-6 rounded-lg border border-[var(--border)]">
          <div class="text-4xl font-bold text-orange-500">--</div>
          <div class="text-sm text-[var(--secondary)] mt-1">Riesgo Medio</div>
        </div>
        <div class="bg-[var(--card)] p-6 rounded-lg border border-[var(--border)]">
          <div class="text-4xl font-bold text-green-500">--</div>
          <div class="text-sm text-[var(--secondary)] mt-1">Riesgo Bajo</div>
        </div>
        <div class="bg-[var(--card)] p-6 rounded-lg border border-[var(--border)]">
          <div class="text-4xl font-bold text-blue-500">--</div>
          <div class="text-sm text-[var(--secondary)] mt-1">Score Promedio</div>
        </div>
      </div>

      <!-- Info -->
      <div
        class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4"
      >
        <h3 class="font-semibold text-amber-800 dark:text-amber-200">📊 Módulo en desarrollo</h3>
        <p class="text-sm text-amber-700 dark:text-amber-300 mt-1">
          El análisis de riesgos con heatmaps y score predictivo estará disponible en una próxima
          versión.
        </p>
      </div>
    </div>
  `,
})
export class RiskDashboardComponent {
  private apiService = inject(ApiService);
}
