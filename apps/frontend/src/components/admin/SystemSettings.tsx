import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Save,
  Database,
  Mail,
  Bell,
  Shield,
  Globe,
  Clock,
  HardDrive,
  Zap,
  Volume2
} from 'lucide-react';
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
  const [settings, setSettings] = useState<SystemSetting[]>([
    // Base de datos
    {
      id: 'db_host',
      category: 'database',
      name: 'Host de Base de Datos',
      description: 'Dirección del servidor de base de datos',
      type: 'text',
      value: 'localhost',
      defaultValue: 'localhost',
      validation: { required: true }
    },
    {
      id: 'db_port',
      category: 'database',
      name: 'Puerto de Base de Datos',
      description: 'Puerto de conexión a la base de datos',
      type: 'number',
      value: 5432,
      defaultValue: 5432,
      validation: { required: true, min: 1, max: 65535 }
    },
    {
      id: 'db_name',
      category: 'database',
      name: 'Nombre de Base de Datos',
      description: 'Nombre de la base de datos principal',
      type: 'text',
      value: 'waze_monitor',
      defaultValue: 'waze_monitor',
      validation: { required: true }
    },
    {
      id: 'db_max_connections',
      category: 'database',
      name: 'Máximo de Conexiones',
      description: 'Número máximo de conexiones simultáneas',
      type: 'number',
      value: 20,
      defaultValue: 20,
      validation: { required: true, min: 1, max: 100 }
    },

    // Email
    {
      id: 'email_enabled',
      category: 'email',
      name: 'Email Habilitado',
      description: 'Habilitar envío de notificaciones por email',
      type: 'boolean',
      value: true,
      defaultValue: true
    },
    {
      id: 'email_smtp_host',
      category: 'email',
      name: 'SMTP Host',
      description: 'Servidor SMTP para envío de emails',
      type: 'text',
      value: 'smtp.gmail.com',
      defaultValue: 'smtp.gmail.com',
      validation: { required: true }
    },
    {
      id: 'email_smtp_port',
      category: 'email',
      name: 'SMTP Port',
      description: 'Puerto del servidor SMTP',
      type: 'number',
      value: 587,
      defaultValue: 587,
      validation: { required: true, min: 1, max: 65535 }
    },
    {
      id: 'email_from_address',
      category: 'email',
      name: 'Email Remitente',
      description: 'Dirección de email usada como remitente',
      type: 'text',
      value: 'noreply@casisasa.com',
      defaultValue: 'noreply@casisasa.com',
      validation: { required: true, pattern: '^[^@]+@[^@]+\\.[^@]+$' }
    },

    // Notificaciones
    {
      id: 'notifications_enabled',
      category: 'notifications',
      name: 'Notificaciones Habilitadas',
      description: 'Habilitar sistema de notificaciones push',
      type: 'boolean',
      value: true,
      defaultValue: true
    },
    {
      id: 'notification_retention_days',
      category: 'notifications',
      name: 'Retención de Notificaciones',
      description: 'Días para mantener notificaciones en el sistema',
      type: 'number',
      value: 30,
      defaultValue: 30,
      validation: { required: true, min: 1, max: 365 }
    },
    {
      id: 'critical_alert_emails',
      category: 'notifications',
      name: 'Emails de Alertas Críticas',
      description: 'Emails separados por coma para alertas críticas',
      type: 'text',
      value: 'admin@casisasa.com,supervisor@casisasa.com',
      defaultValue: 'admin@casisasa.com',
      validation: { required: true }
    },

    // Seguridad
    {
      id: 'session_timeout',
      category: 'security',
      name: 'Tiempo de Sesión',
      description: 'Minutos antes de que expire la sesión automáticamente',
      type: 'number',
      value: 480,
      defaultValue: 480,
      validation: { required: true, min: 15, max: 1440 }
    },
    {
      id: 'password_min_length',
      category: 'security',
      name: 'Longitud Mínima de Contraseña',
      description: 'Caracteres mínimos requeridos para contraseñas',
      type: 'number',
      value: 8,
      defaultValue: 8,
      validation: { required: true, min: 6, max: 50 }
    },
    {
      id: 'two_factor_enabled',
      category: 'security',
      name: '2FA Obligatorio',
      description: 'Requerir autenticación de dos factores',
      type: 'boolean',
      value: false,
      defaultValue: false
    },

    // Sistema
    {
      id: 'timezone',
      category: 'system',
      name: 'Zona Horaria',
      description: 'Zona horaria del sistema',
      type: 'select',
      value: 'America/Argentina/Cordoba',
      defaultValue: 'America/Argentina/Cordoba',
      options: [
        { label: 'Argentina - Córdoba', value: 'America/Argentina/Cordoba' },
        { label: 'Argentina - Buenos Aires', value: 'America/Argentina/Buenos_Aires' },
        { label: 'UTC', value: 'UTC' },
        { label: 'GMT', value: 'GMT' }
      ],
      validation: { required: true }
    },
    {
      id: 'log_level',
      category: 'system',
      name: 'Nivel de Logs',
      description: 'Nivel de detalle para los logs del sistema',
      type: 'select',
      value: 'info',
      defaultValue: 'info',
      options: [
        { label: 'Error', value: 'error' },
        { label: 'Advertencia', value: 'warn' },
        { label: 'Información', value: 'info' },
        { label: 'Debug', value: 'debug' }
      ],
      validation: { required: true }
    },
    {
      id: 'maintenance_mode',
      category: 'system',
      name: 'Modo Mantenimiento',
      description: 'Activar modo mantenimiento (solo administradores)',
      type: 'boolean',
      value: false,
      defaultValue: false
    }
  ]);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [hasChanges, setHasChanges] = useState(false);

  const categories = [
    { id: 'all', name: 'Todas', icon: Settings, color: 'gray' },
    { id: 'voice', name: 'Voz (TTS)', icon: Volume2, color: 'indigo' },
    { id: 'database', name: 'Base de Datos', icon: Database, color: 'blue' },
    { id: 'email', name: 'Email', icon: Mail, color: 'green' },
    { id: 'notifications', name: 'Notificaciones', icon: Bell, color: 'yellow' },
    { id: 'security', name: 'Seguridad', icon: Shield, color: 'red' },
    { id: 'system', name: 'Sistema', icon: Globe, color: 'purple' }
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
          const count = category.id === 'all' ? settings.length : settings.filter(s => s.category === category.id).length;

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

      {/* Configuración de Voz TTS (categoría especial) */}
      {activeCategory === 'voice' && (
        <TTSConfiguration />
      )}

      {/* Configuraciones estándar */}
      {activeCategory !== 'voice' && (
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
