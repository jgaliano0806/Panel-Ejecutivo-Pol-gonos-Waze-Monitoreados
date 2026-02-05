/**
 * Configuración del sistema de TTS (Text-to-Speech)
 * Usa Edge TTS - Voces neuronales de Microsoft 100% GRATUITAS
 */
import { useState, useEffect } from "react";
import { Volume2, Play, Save, Check, Mic } from "lucide-react";
import {
  getTTSConfig,
  configureTTS,
  testVoice,
  getAvailableVoices,
  EDGE_TTS_VOICES,
} from "../../lib/tts-service";

export const TTSConfiguration = () => {
  const [selectedVoice, setSelectedVoice] = useState<string>(
    EDGE_TTS_VOICES.ELENA_AR,
  );
  const [rate, setRate] = useState("-5%");
  const [isTesting, setIsTesting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [voices, setVoices] = useState<
    Array<{ id: string; name: string; gender: string; description: string }>
  >([]);

  useEffect(() => {
    // Cargar configuración existente
    const config = getTTSConfig();
    setSelectedVoice(config.voice);
    setRate(config.rate);

    // Cargar voces disponibles
    getAvailableVoices().then(setVoices);
  }, []);

  const handleSave = () => {
    configureTTS({ voice: selectedVoice, rate });
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      // Aplicar config temporal para la prueba
      configureTTS({ voice: selectedVoice, rate });
      await testVoice();
    } catch (error) {
      console.error("Error en prueba de voz:", error);
    }
    setIsTesting(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
          <Volume2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Configuración de Voz (TTS)
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sistema de notificaciones por voz para sala de control
          </p>
        </div>
      </div>

      {/* Estado actual */}
      <div className="flex items-center gap-2 p-3 rounded-lg mb-6 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
        <Check className="h-5 w-5" />
        <span className="font-medium">
          Microsoft Edge TTS activo - Voces neuronales argentinas 100% gratis
        </span>
      </div>

      {/* Configuración */}
      <div className="space-y-4">
        <div>
          <label
            htmlFor="voice-select"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            <Mic className="inline h-4 w-4 mr-1" />
            Voz preferida
          </label>
          <select
            id="voice-select"
            aria-label="Voz preferida"
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            {voices.length > 0 ? (
              voices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name} - {voice.description}
                </option>
              ))
            ) : (
              <>
                <option value="es-AR-ElenaNeural">
                  Elena - Femenina argentina (recomendada)
                </option>
                <option value="es-AR-TomasNeural">
                  Tomás - Masculina argentina
                </option>
                <option value="es-MX-DaliaNeural">
                  Dalia - Femenina mexicana
                </option>
                <option value="es-MX-JorgeNeural">
                  Jorge - Masculina mexicana
                </option>
              </>
            )}
          </select>
        </div>

        <div>
          <label
            htmlFor="rate-select"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Velocidad de lectura
          </label>
          <select
            id="rate-select"
            aria-label="Velocidad de lectura"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="-15%">Muy lenta (para ambientes ruidosos)</option>
            <option value="-10%">Lenta</option>
            <option value="-5%">Normal (recomendada)</option>
            <option value="+0%">Estándar</option>
            <option value="+5%">Rápida</option>
            <option value="+10%">Muy rápida</option>
          </select>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-wrap gap-3 pt-4">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
          >
            <Save className="h-4 w-4" />
            {saveStatus === "saved" ? "¡Guardado!" : "Guardar configuración"}
          </button>

          <button
            onClick={handleTest}
            disabled={isTesting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            {isTesting ? "Reproduciendo..." : "Probar voz"}
          </button>
        </div>
      </div>

      {/* Información adicional */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
          ¿Por qué Edge TTS?
        </h4>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>
            ✅ <strong>100% gratuito</strong> - Sin límites de uso
          </li>
          <li>
            ✅ <strong>Voces neuronales</strong> - Calidad profesional
          </li>
          <li>
            ✅ <strong>Español argentino nativo</strong> - Elena y Tomás
          </li>
          <li>
            ✅ <strong>Ideal para salas de control</strong> - Claridad y
            naturalidad
          </li>
          <li>
            ✅ <strong>Sin API keys</strong> - Funciona out-of-the-box
          </li>
        </ul>
      </div>
    </div>
  );
};
