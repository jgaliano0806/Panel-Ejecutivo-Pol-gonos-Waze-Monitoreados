/**
 * TTSConfigComponent - Configuración de Text-to-Speech
 * Equivalente a: apps/frontend/src/components/admin/TTSConfiguration.tsx
 */
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TTSService } from '../../../core/services';

interface Voice {
  id: string;
  name: string;
  gender: string;
  description: string;
}

@Component({
  selector: 'app-tts-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-6">
        <div class="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
          <span class="text-2xl">🔊</span>
        </div>
        <div>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">
            Configuración de Voz (TTS)
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Sistema de notificaciones por voz para sala de control
          </p>
        </div>
      </div>

      <!-- Estado actual -->
      <div
        class="flex items-center gap-2 p-3 rounded-lg mb-6 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
      >
        <span>✅</span>
        <span class="font-medium">
          Microsoft Edge TTS activo - Voces neuronales argentinas 100% gratis
        </span>
      </div>

      <!-- Configuración -->
      <div class="space-y-4">
        <!-- Selección de voz -->
        <div>
          <label
            for="voice-select"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            🎤 Voz preferida
          </label>
          <select
            id="voice-select"
            [(ngModel)]="selectedVoice"
            aria-label="Voz preferida"
            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            @for (voice of voices(); track voice.id) {
              <option [value]="voice.id">{{ voice.name }} - {{ voice.description }}</option>
            } @empty {
              <option value="es-AR-ElenaNeural">Elena - Femenina argentina (recomendada)</option>
              <option value="es-AR-TomasNeural">Tomás - Masculina argentina</option>
              <option value="es-MX-DaliaNeural">Dalia - Femenina mexicana</option>
              <option value="es-MX-JorgeNeural">Jorge - Masculina mexicana</option>
            }
          </select>
        </div>

        <!-- Velocidad -->
        <div>
          <label
            for="rate-select"
            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Velocidad de lectura
          </label>
          <select
            id="rate-select"
            [(ngModel)]="rate"
            aria-label="Velocidad de lectura"
            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="-15%">Muy lenta (para ambientes ruidosos)</option>
            <option value="-10%">Lenta</option>
            <option value="-5%">Normal (recomendada)</option>
            <option value="+0%">Estándar</option>
            <option value="+5%">Rápida</option>
            <option value="+10%">Muy rápida</option>
          </select>
        </div>

        <!-- Botones de acción -->
        <div class="flex flex-wrap gap-3 pt-4">
          <button
            (click)="handleSave()"
            class="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
          >
            💾 {{ saveStatus() === 'saved' ? '¡Guardado!' : 'Guardar configuración' }}
          </button>

          <button
            (click)="handleTest()"
            [disabled]="isTesting()"
            class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            ▶️ {{ isTesting() ? 'Reproduciendo...' : 'Probar voz' }}
          </button>
        </div>
      </div>

      <!-- Información adicional -->
      <div class="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <h4 class="font-medium text-gray-900 dark:text-white mb-2">¿Por qué Edge TTS?</h4>
        <ul class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>✅ <strong>100% gratuito</strong> - Sin límites de uso</li>
          <li>✅ <strong>Voces neuronales</strong> - Calidad profesional</li>
          <li>✅ <strong>Español argentino nativo</strong> - Elena y Tomás</li>
          <li>✅ <strong>Ideal para salas de control</strong> - Claridad y naturalidad</li>
          <li>✅ <strong>Sin API keys</strong> - Funciona out-of-the-box</li>
        </ul>
      </div>
    </div>
  `,
})
export class TTSConfigComponent implements OnInit {
  private ttsService = inject(TTSService);

  selectedVoice = 'es-AR-ElenaNeural';
  rate = '-5%';

  readonly voices = signal<Voice[]>([]);
  readonly isTesting = signal(false);
  readonly saveStatus = signal<'idle' | 'saved'>('idle');

  ngOnInit(): void {
    // Cargar configuración existente desde localStorage
    const savedVoice = localStorage.getItem('tts-voice');
    const savedRate = localStorage.getItem('tts-rate');

    if (savedVoice) this.selectedVoice = savedVoice;
    if (savedRate) this.rate = savedRate;

    // Cargar voces disponibles desde el servicio
    this.loadVoices();
  }

  private loadVoices(): void {
    // Voces de Edge TTS soportadas
    this.voices.set([
      {
        id: 'es-AR-ElenaNeural',
        name: 'Elena',
        gender: 'Femenino',
        description: 'Argentina (recomendada)',
      },
      { id: 'es-AR-TomasNeural', name: 'Tomás', gender: 'Masculino', description: 'Argentina' },
      { id: 'es-MX-DaliaNeural', name: 'Dalia', gender: 'Femenino', description: 'Mexicana' },
      { id: 'es-MX-JorgeNeural', name: 'Jorge', gender: 'Masculino', description: 'Mexicana' },
      { id: 'es-ES-ElviraNeural', name: 'Elvira', gender: 'Femenino', description: 'Española' },
      { id: 'es-ES-AlvaroNeural', name: 'Álvaro', gender: 'Masculino', description: 'Española' },
    ]);
  }

  handleSave(): void {
    // Guardar en localStorage
    localStorage.setItem('tts-voice', this.selectedVoice);
    localStorage.setItem('tts-rate', this.rate);

    // Configurar el servicio TTS
    this.ttsService.configure({ voice: this.selectedVoice, rate: this.rate });

    this.saveStatus.set('saved');
    setTimeout(() => this.saveStatus.set('idle'), 2000);
  }

  async handleTest(): Promise<void> {
    this.isTesting.set(true);
    try {
      // Configurar y probar
      this.ttsService.configure({ voice: this.selectedVoice, rate: this.rate });
      await this.ttsService.testVoice();
    } catch (error) {
      console.error('Error en prueba de voz:', error);
    }
    this.isTesting.set(false);
  }
}
