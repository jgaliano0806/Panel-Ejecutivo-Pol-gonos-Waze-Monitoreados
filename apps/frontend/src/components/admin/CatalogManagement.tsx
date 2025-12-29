import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Edit3,
  Save,
  X,
  Plus,
  AlertTriangle,
  Car,
  MapPin,
  Cloud,
  Wrench,
  Zap,
  Eye,
  RefreshCw,
  Download,
  TrendingUp,
  Database
} from 'lucide-react';

interface IncidentType {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface IncidentSubtype {
  id: string;
  typeId: string;
  code: string;
  name: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const defaultTypes: IncidentType[] = [
  {
    id: '1',
    code: 'ACCIDENT',
    name: 'Accidente Vial',
    description: 'Incidentes relacionados con accidentes de tránsito',
    icon: 'car',
    color: '#ef4444',
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },
  {
    id: '2',
    code: 'JAM',
    name: 'Congestión',
    description: 'Tráfico congestionado y lentitud en las vías',
    icon: 'alert-triangle',
    color: '#f59e0b',
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },
  {
    id: '3',
    code: 'HAZARD',
    name: 'Peligro',
    description: 'Situaciones peligrosas en la vía',
    icon: 'alert-triangle',
    color: '#dc2626',
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },
  {
    id: '4',
    code: 'WEATHER',
    name: 'Clima',
    description: 'Condiciones climáticas adversas',
    icon: 'cloud',
    color: '#06b6d4',
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  }
];

const defaultSubtypes: IncidentSubtype[] = [
  {
    id: '1',
    typeId: '1',
    code: 'ACCIDENT_MINOR',
    name: 'Accidente Menor',
    description: 'Accidente con daños menores',
    severity: 'MEDIUM',
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },
  {
    id: '2',
    typeId: '1',
    code: 'ACCIDENT_MAJOR',
    name: 'Accidente Grave',
    description: 'Accidente con heridos o daños graves',
    severity: 'HIGH',
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  },
  {
    id: '3',
    typeId: '2',
    code: 'JAM_MODERATE',
    name: 'Congestión Moderada',
    description: 'Tráfico lento pero fluido',
    severity: 'LOW',
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  }
];

const CatalogManagement: React.FC = () => {
  const [types, setTypes] = useState<IncidentType[]>([]);
  const [subtypes, setSubtypes] = useState<IncidentSubtype[]>([]);
  const [activeTab, setActiveTab] = useState<'types' | 'subtypes'>('types');
  const [editingType, setEditingType] = useState<IncidentType | null>(null);
  const [editingSubtype, setEditingSubtype] = useState<IncidentSubtype | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // API base URL
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // Cargar datos iniciales
  useEffect(() => {
    loadCatalogs();
    loadStats();
  }, []);

  const loadCatalogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/catalogs`);
      if (response.ok) {
        const data = await response.json();
        // Transformar datos de la API al formato del componente
        const apiTypes: IncidentType[] = data.map((item: any) => ({
          id: item.id.toString(),
          code: item.code,
          name: item.name,
          description: item.description,
          icon: item.icon,
          color: item.color,
          isActive: item.type_active,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        }));
        setTypes(apiTypes);

        // Extraer subtipos
        const apiSubtypes: IncidentSubtype[] = [];
        data.forEach((item: any) => {
          if (item.subtypes && Array.isArray(item.subtypes)) {
            item.subtypes.forEach((subtype: any) => {
              if (subtype.id) {
                apiSubtypes.push({
                  id: subtype.id.toString(),
                  typeId: item.id.toString(),
                  code: subtype.code,
                  name: subtype.name,
                  description: subtype.description,
                  severity: subtype.severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
                  isActive: subtype.is_active,
                  createdAt: subtype.created_at,
                  updatedAt: subtype.updated_at
                });
              }
            });
          }
        });
        setSubtypes(apiSubtypes);
      }
    } catch (error) {
      console.error('Error cargando catálogos:', error);
      // Fallback a datos por defecto
      setTypes(defaultTypes);
      setSubtypes(defaultSubtypes);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/catalogs/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const syncFromWaze = async () => {
    try {
      setSyncing(true);
      const response = await fetch(`${API_URL}/api/catalogs/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Sincronización completada!\n\n${result.data.newTypes} nuevos tipos\n${result.data.newSubtypes} nuevos subtipos\n${result.data.totalIncidents} incidentes procesados`);

        // Recargar datos
        await loadCatalogs();
        await loadStats();
      } else {
        const error = await response.json();
        alert(`❌ Error en sincronización: ${error.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error sincronizando:', error);
      alert('❌ Error de conexión al sincronizar catálogos');
    } finally {
      setSyncing(false);
    }
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'car': return Car;
      case 'alert-triangle': return AlertTriangle;
      case 'map-pin': return MapPin;
      case 'cloud': return Cloud;
      case 'wrench': return Wrench;
      case 'zap': return Zap;
      default: return AlertTriangle;
    }
  };

  const handleSaveType = async (type: IncidentType) => {
    try {
      const isEditing = editingType !== null;
      const url = isEditing ? `${API_URL}/api/catalogs/types/${type.id}` : `${API_URL}/api/catalogs/types`;
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: type.code,
          name: type.name,
          description: type.description,
          icon: type.icon,
          color: type.color,
          is_active: type.isActive
        })
      });

      if (response.ok) {
        await loadCatalogs(); // Recargar datos
        setEditingType(null);
        setShowForm(false);
        alert(`✅ Tipo ${isEditing ? 'actualizado' : 'creado'} exitosamente`);
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error guardando tipo:', error);
      alert('❌ Error de conexión al guardar tipo');
    }
  };

  const handleSaveSubtype = async (subtype: IncidentSubtype) => {
    try {
      const isEditing = editingSubtype !== null;
      const url = isEditing ? `${API_URL}/api/catalogs/subtypes/${subtype.id}` : `${API_URL}/api/catalogs/subtypes`;
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type_id: parseInt(subtype.typeId),
          code: subtype.code,
          name: subtype.name,
          description: subtype.description,
          severity: subtype.severity,
          is_active: subtype.isActive
        })
      });

      if (response.ok) {
        await loadCatalogs(); // Recargar datos
        setEditingSubtype(null);
        setShowForm(false);
        alert(`✅ Subtipo ${isEditing ? 'actualizado' : 'creado'} exitosamente`);
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error guardando subtipo:', error);
      alert('❌ Error de conexión al guardar subtipo');
    }
  };

  const handleDeleteType = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este tipo? También se eliminarán todos sus subtipos.')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/catalogs/types/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadCatalogs(); // Recargar datos
        alert('✅ Tipo eliminado exitosamente');
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error eliminando tipo:', error);
      alert('❌ Error de conexión al eliminar tipo');
    }
  };

  const handleDeleteSubtype = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este subtipo?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/catalogs/subtypes/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadCatalogs(); // Recargar datos
        alert('✅ Subtipo eliminado exitosamente');
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error eliminando subtipo:', error);
      alert('❌ Error de conexión al eliminar subtipo');
    }
  };

  const getTypeName = (typeId: string) => {
    const type = types.find(t => t.id === typeId);
    return type?.name || 'Tipo desconocido';
  };

  const TypeForm: React.FC<{
    type: IncidentType | null;
    onSave: (type: IncidentType) => void;
    onCancel: () => void;
  }> = ({ type, onSave, onCancel }) => {
    const [formData, setFormData] = useState<IncidentType>(
      type || {
        id: '',
        code: '',
        name: '',
        description: '',
        icon: 'alert-triangle',
        color: '#6b7280',
        isActive: true,
        createdAt: '',
        updatedAt: ''
      }
    );

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave(formData);
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-xl shadow-2xl max-w-md w-full"
        >
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {type ? 'Editar Tipo' : 'Nuevo Tipo'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ACCIDENT"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Accidente Vial"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Descripción del tipo de incidente"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Icono
                  </label>
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="alert-triangle">⚠️ AlertTriangle</option>
                    <option value="car">🚗 Car</option>
                    <option value="map-pin">📍 MapPin</option>
                    <option value="cloud">☁️ Cloud</option>
                    <option value="wrench">🔧 Wrench</option>
                    <option value="zap">⚡ Zap</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Tipo activo
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  {type ? 'Actualizar' : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                >
                  <X size={16} />
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    );
  };

  const SubtypeForm: React.FC<{
    subtype: IncidentSubtype | null;
    onSave: (subtype: IncidentSubtype) => void;
    onCancel: () => void;
  }> = ({ subtype, onSave, onCancel }) => {
    const [formData, setFormData] = useState<IncidentSubtype>(
      subtype || {
        id: '',
        typeId: '',
        code: '',
        name: '',
        description: '',
        severity: 'MEDIUM',
        isActive: true,
        createdAt: '',
        updatedAt: ''
      }
    );

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave(formData);
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-xl shadow-2xl max-w-md w-full"
        >
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {subtype ? 'Editar Subtipo' : 'Nuevo Subtipo'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo Padre
                </label>
                <select
                  value={formData.typeId}
                  onChange={(e) => setFormData({ ...formData, typeId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Seleccionar tipo...</option>
                  {types.filter(t => t.isActive).map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ACCIDENT_MINOR"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Accidente Menor"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Severidad
                </label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="LOW">Baja</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                  <option value="CRITICAL">Crítica</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Descripción del subtipo"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="subtypeActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="subtypeActive" className="text-sm text-gray-700">
                  Subtipo activo
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  {subtype ? 'Actualizar' : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                >
                  <X size={16} />
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Gestión de Catálogos
            </h2>
            <p className="text-gray-600">
              Administra los tipos y subtipos de incidentes del sistema
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={syncFromWaze}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {syncing ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              {syncing ? 'Sincronizando...' : 'Sincronizar desde Waze'}
            </button>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-gray-200 rounded-lg p-4"
          >
            <div className="flex items-center gap-3">
              <Database className="text-blue-600" size={24} />
              <div>
                <p className="text-sm text-gray-600">Total Incidentes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_incidents || 0}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-gray-200 rounded-lg p-4"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-green-600" size={24} />
              <div>
                <p className="text-sm text-gray-600">Tipos Únicos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.unique_types || 0}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-gray-200 rounded-lg p-4"
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="text-purple-600" size={24} />
              <div>
                <p className="text-sm text-gray-600">Subtipos Únicos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.unique_subtypes || 0}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white border border-gray-200 rounded-lg p-4"
          >
            <div className="flex items-center gap-3">
              <RefreshCw className="text-orange-600" size={24} />
              <div>
                <p className="text-sm text-gray-600">Última Sync</p>
                <p className="text-sm font-medium text-gray-900">
                  {stats.last_sync ? new Date(stats.last_sync).toLocaleDateString('es-AR') : 'Nunca'}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={24} className="animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Cargando catálogos...</span>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('types')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'types'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tipos de Incidentes ({types.length})
            </button>
            <button
              onClick={() => setActiveTab('subtypes')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'subtypes'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Subtipos ({subtypes.length})
            </button>
          </div>

          {/* Tipos de Incidentes */}
          {activeTab === 'types' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Tipos de Incidentes
                </h3>
                <button
                  onClick={() => {
                    setEditingType(null);
                    setShowForm(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus size={16} />
                  Nuevo Tipo
                </button>
              </div>

          <div className="grid gap-4">
            {types.map((type) => {
              const IconComponent = getIconComponent(type.icon);
              return (
                <motion.div
                  key={type.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: type.color + '20', color: type.color }}
                      >
                        <IconComponent size={24} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{type.name}</h4>
                        <p className="text-sm text-gray-600">{type.code}</p>
                        <p className="text-sm text-gray-500 mt-1">{type.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        type.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {type.isActive ? 'Activo' : 'Inactivo'}
                      </span>

                      <button
                        onClick={() => {
                          setEditingType(type);
                          setShowForm(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit3 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
              })}
            </div>
          </div>
        )}

        {/* Subtipos */}
        {activeTab === 'subtypes' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Subtipos de Incidentes
              </h3>
              <button
                onClick={() => {
                  setEditingSubtype(null);
                  setShowForm(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                Nuevo Subtipo
              </button>
            </div>

          <div className="grid gap-4">
            {subtypes.map((subtype) => {
              const severityColors = {
                LOW: 'bg-green-100 text-green-800',
                MEDIUM: 'bg-yellow-100 text-yellow-800',
                HIGH: 'bg-orange-100 text-orange-800',
                CRITICAL: 'bg-red-100 text-red-800'
              };

              return (
                <motion.div
                  key={subtype.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h4 className="font-semibold text-gray-900">{subtype.name}</h4>
                        <span className="text-sm text-gray-500">({subtype.code})</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${severityColors[subtype.severity]}`}>
                          {subtype.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{subtype.description}</p>
                      <p className="text-xs text-gray-500">
                        Tipo: {getTypeName(subtype.typeId)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        subtype.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {subtype.isActive ? 'Activo' : 'Inactivo'}
                      </span>

                      <button
                        onClick={() => {
                          setEditingSubtype(subtype);
                          setShowForm(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit3 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
              })}
            </div>
          </div>
        )}
        </>
      )}

      {/* Modales */}
      {showForm && editingType !== null && (
        <TypeForm
          type={editingType}
          onSave={handleSaveType}
          onCancel={() => {
            setEditingType(null);
            setShowForm(false);
          }}
        />
      )}

      {showForm && editingSubtype !== null && (
        <SubtypeForm
          subtype={editingSubtype}
          onSave={handleSaveSubtype}
          onCancel={() => {
            setEditingSubtype(null);
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
};

export default CatalogManagement;
