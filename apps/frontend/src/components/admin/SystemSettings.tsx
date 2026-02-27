import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, Volume2 } from 'lucide-react';
import { TTSConfiguration } from './TTSConfiguration';

interface SystemSetting {
  id: string;
  category: string;
  name: string;
  description: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea';
  value: any;
  defaultValue: any;
  options?: { label: string; value: any }[];
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
  };
}

const SystemSettings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [hasChanges, setHasChanges] = useState(false);

  const categories = [
    { id: 'all', name: 'Todas', icon: Settings, color: 'gray' },
    { id: 'voice', name: 'Voz (TTS)', icon: Volume2, color: 'indigo' }
  ];

  const filteredSettings = activeCategory === 'all'
    ? settings
    : settings.filter(setting => setting.category === activeCategory);

  const updateSetting = (id: string, value: any) => {
    setSettings(prev => prev.map(setting =>
      setting.id === id ? { ...setting, value } : setting
    ));
    setHasChanges(true);
  };

  const resetToDefault = (id: string) => {
    setSettings(prev => prev.map(setting =>
      setting.id === id ? { ...setting, value: setting.defaultValue } : setting
    ));
    setHasChanges(true);
  };

  const saveSettings = () => {
    // Aquí iría la lógica para guardar en backend
    console.log('Guardando configuración:', settings);
    setHasChanges(false);
    alert('Configuración guardada exitosamente');
  };

  const renderSettingInput = (setting: SystemSetting) => {
    switch (setting.type) {
      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={setting.value}
              onChange={(e) => updateSetting(setting.id, e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              {setting.value ? 'Habilitado' : 'Deshabilitado'}
            </span>
          </label>
        );

      case 'number':
        return (
          <input
            type="number"
            value={setting.value}
            onChange={(e) => updateSetting(setting.id, Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min={setting.validation?.min}
            max={setting.validation?.max}
          />
        );

      case 'select':
        return (
          <select
            value={setting.value}
            onChange={(e) => updateSetting(setting.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {setting.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            value={setting.value}
            onChange={(e) => updateSetting(setting.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
        );

      default:
        return (
          <input
            type="text"
            value={setting.value}
            onChange={(e) => updateSetting(setting.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Configuración del Sistema
        </h2>
        <p className="text-gray-600">
          Parámetros generales y configuración avanzada del sistema de monitoreo
        </p>
      </div>

      {/* Categorías */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {categories.map((category) => {
          const Icon = category.icon;
          const isActive = activeCategory === category.id;
          const count = category.id === 'all' || category.id === 'voice' ? 1 : settings.filter(s => s.category === category.id).length;

          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? `bg-${category.color}-100 text-${category.color}-800 border-2 border-${category.color}-300`
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon size={16} />
              {category.name}
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                isActive ? `bg-${category.color}-200` : 'bg-gray-200'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Configuración de Voz TTS */}
      {(activeCategory === 'all' || activeCategory === 'voice') && (
        <TTSConfiguration />
      )}

      {/* Configuraciones estándar (si hubiera otras categorías) */}
      {activeCategory !== 'voice' && activeCategory !== 'all' && (
      <div className="space-y-6">
        {filteredSettings.map((setting) => (
          <motion.div
            key={setting.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-gray-200 rounded-lg p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {setting.name}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {setting.description}
                </p>

                <div className="max-w-md">
                  {renderSettingInput(setting)}
                </div>
              </div>

              <button
                onClick={() => resetToDefault(setting.id)}
                className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                title="Restaurar valor por defecto"
              >
                Reset
              </button>
            </div>
          </motion.div>
        ))}
      </div>
      )}

      {/* Barra de acciones */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 bg-white border border-gray-200 rounded-lg shadow-lg p-4"
        >
          <p className="text-sm text-gray-600 mb-3">
            Tienes cambios sin guardar
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setSettings(prev => prev.map(s => ({ ...s, value: s.defaultValue })))}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Descartar
            </button>
            <button
              onClick={saveSettings}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Save size={16} />
              Guardar Cambios
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SystemSettings;
