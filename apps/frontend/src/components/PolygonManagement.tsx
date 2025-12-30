import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { realCordobaPolygons } from '../data/mock/realCordobaPolygons';
import { VirtualizedList } from './ui/VirtualizedList';
import { TruncatedText } from './TruncatedText';

interface PolygonData {
  id: string;
  name: string;
  feedUrl: string;
  tvtFeedUrl?: string;
  group?: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
  geometry?: {
    type: string;
    coordinates: number[][][];
  };
}

const PolygonManagement: React.FC = () => {
  const [polygons, setPolygons] = useState<PolygonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPolygon, setEditingPolygon] = useState<PolygonData | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showGeoJsonModal, setShowGeoJsonModal] = useState(false);
  const [selectedGeoJson, setSelectedGeoJson] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Función para obtener geometría completa desde mock data
  const getPolygonGeometry = (polygonId: string) => {
    const mockPolygon = realCordobaPolygons.find(p => p.id === polygonId);
    return mockPolygon?.geometry || null;
  };

  // Validaciones
  const validateField = (field: string, value: any): string => {
    const formData = editingPolygon || {
      id: '',
      name: '',
      feedUrl: '',
      tvtFeedUrl: '',
      group: '',
      coordinates: { lat: 0, lon: 0 }
    };

    switch (field) {
      case 'id':
        if (!value || value.trim() === '') return 'ID es requerido';
        if (!/^P\d{3}$/.test(value)) return 'ID debe tener formato PXXX (ej: P001)';
        if (!editingPolygon && polygons.some(p => p.id === value)) return 'Este ID ya existe';
        if (editingPolygon && editingPolygon.id !== value && polygons.some(p => p.id === value)) return 'Este ID ya existe';
        return '';

      case 'name':
        if (!value || value.trim() === '') return 'Nombre es requerido';
        if (value.trim().length < 3) return 'Nombre debe tener al menos 3 caracteres';
        return '';

      case 'feedUrl':
        if (!value || value.trim() === '') return 'Feed URL es requerido';
        try {
          new URL(value);
        } catch {
          return 'Debe ser una URL válida (https://...)';
        }
        return '';

      case 'tvtFeedUrl':
        if (value && value.trim() !== '') {
          try {
            new URL(value);
          } catch {
            return 'Debe ser una URL válida (https://...)';
          }
        }
        return '';

      case 'group':
        // Grupo es opcional, sin validaciones específicas
        return '';

      case 'geometry':
        if (value && value.trim() !== '') {
          try {
            const geometry = JSON.parse(value);
            if (geometry.type !== 'Polygon') return 'Debe ser un Polygon GeoJSON';
            if (!geometry.coordinates || !Array.isArray(geometry.coordinates[0])) return 'Coordenadas inválidas';
            if (geometry.coordinates[0].length < 3) return 'Debe tener al menos 3 vértices';
            return '';
          } catch {
            return 'JSON inválido';
          }
        }
        return '';

      case 'coordinates':
        if (!formData.geometry) { // Solo validar si no hay geometría
          if (value?.lat !== undefined && (value.lat < -90 || value.lat > 90)) {
            return 'Latitud debe estar entre -90 y 90';
          }
          if (value?.lon !== undefined && (value.lon < -180 || value.lon > 180)) {
            return 'Longitud debe estar entre -180 y 180';
          }
        }
        return '';

      default:
        return '';
    }
  };

  const validateForm = (): boolean => {
    const formData = editingPolygon || {
      id: '',
      name: '',
      feedUrl: '',
      tvtFeedUrl: '',
      group: '',
      coordinates: { lat: 0, lon: 0 }
    };

    const newErrors: Record<string, string> = {};

    // Validar todos los campos
    Object.keys(formData).forEach(key => {
      const error = validateField(key, (formData as any)[key]);
      if (error) newErrors[key] = error;
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Función para calcular el centro de un polígono GeoJSON
  const calculateCenterFromGeometry = (geometry: any) => {
    if (!geometry || !geometry.coordinates || !geometry.coordinates[0]) return null;

    const coords = geometry.coordinates[0];
    let latSum = 0;
    let lonSum = 0;
    let count = 0;

    coords.forEach((coord: number[]) => {
      lonSum += coord[0]; // longitude first in GeoJSON
      latSum += coord[1]; // latitude second
      count++;
    });

    return {
      lat: latSum / count,
      lon: lonSum / count
    };
  };

  // Función para validar y parsear GeoJSON
  const parseGeoJsonGeometry = (geoJsonText: string) => {
    try {
      const geometry = JSON.parse(geoJsonText);
      if (geometry.type === 'Polygon' && geometry.coordinates && geometry.coordinates[0]) {
        return geometry;
      }
      throw new Error('Geometría inválida');
    } catch (error) {
      throw new Error('JSON inválido o geometría no válida');
    }
  };

  // Cargar polígonos desde el backend
  useEffect(() => {
    fetchPolygons();
  }, []);

  const fetchPolygons = async () => {
    try {
      const response = await fetch('/api/polygons');
      if (response.ok) {
        const data = await response.json();
        setPolygons(data);
      }
    } catch (error) {
      console.error('Error al cargar polígonos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (polygon: PolygonData) => {
    // Si no tiene geometría pero existe en mock data, cargarla
    let polygonToEdit = { ...polygon };
    if (!polygon.geometry) {
      const mockGeometry = getPolygonGeometry(polygon.id);
      if (mockGeometry) {
        polygonToEdit.geometry = mockGeometry;
        // Recalcular centro si es necesario
        const center = calculateCenterFromGeometry(mockGeometry);
        if (center) {
          polygonToEdit.coordinates = center;
        }
      }
    }

    setEditingPolygon(polygonToEdit);
    setShowForm(true);
    // Limpiar errores al abrir el formulario
    setErrors({});
    setTouched({});
  };

  const handleNew = () => {
    setEditingPolygon(null);
    setShowForm(true);
    setErrors({});
    setTouched({});
  };

  const handleDelete = async (polygonId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este polígono?')) return;

    try {
      const response = await fetch(`/api/polygons/${polygonId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPolygons(polygons.filter(p => p.id !== polygonId));
      } else {
        alert('Error al eliminar el polígono');
      }
    } catch (error) {
      console.error('Error al eliminar polígono:', error);
      alert('Error al eliminar el polígono');
    }
  };

  const handleSave = async (polygonData: PolygonData) => {
    try {
      const isNew = !polygonData.id || polygons.find(p => p.id === polygonData.id) === undefined;
      const method = isNew ? 'POST' : 'PUT';
      const url = isNew ? '/api/polygons' : `/api/polygons/${polygonData.id}`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(polygonData),
      });

      if (response.ok) {
        await fetchPolygons(); // Recargar lista
        setShowForm(false);
        setEditingPolygon(null);
      } else {
        alert('Error al guardar el polígono');
      }
    } catch (error) {
      console.error('Error al guardar polígono:', error);
      alert('Error al guardar el polígono');
    }
  };

  const PolygonForm: React.FC<{
    polygon: PolygonData | null;
    formData: PolygonData;
    onSave: (polygon: PolygonData) => void;
    onCancel: () => void;
    errors: Record<string, string>;
    touched: Record<string, boolean>;
    onFieldChange: (field: string, value: any) => void;
    onValidateForm: () => boolean;
    polygons: PolygonData[];
  }> = ({ polygon, formData, onSave, onCancel, errors, touched, onFieldChange, onValidateForm, polygons }) => {

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();

      // Marcar todos los campos como tocados para mostrar errores
      const allTouched: Record<string, boolean> = {};
      Object.keys(formData).forEach(key => {
        allTouched[key] = true;
      });
      // Aquí deberíamos actualizar touched, pero como está en el padre, por ahora solo validamos
      if (onValidateForm()) {
        onSave(formData);
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={onCancel}
      >
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <h2 className="text-xl font-bold">
              {polygon ? 'Editar Polígono' : 'Nuevo Polígono'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => onFieldChange('id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.id && touched.id ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="P001, P002, etc."
                  required
                />
                {errors.id && touched.id && (
                  <p className="text-red-500 text-xs mt-1">{errors.id}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => onFieldChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name && touched.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ej: A-019 -8, RP E53 -2"
                  required
                />
                {errors.name && touched.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grupo
                </label>
                <input
                  type="text"
                  value={formData.group || ''}
                  onChange={(e) => onFieldChange('group', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.group && touched.group ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ej: Autovía A-019, Ruta Nacional 36..."
                />
                {errors.group && touched.group && (
                  <p className="text-red-500 text-xs mt-1">{errors.group}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Feed URL (Incidentes) <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={formData.feedUrl}
                  onChange={(e) => onFieldChange('feedUrl', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.feedUrl && touched.feedUrl ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="https://..."
                  required
                />
                {errors.feedUrl && touched.feedUrl && (
                  <p className="text-red-500 text-xs mt-1">{errors.feedUrl}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TVT Feed URL (Opcional)
                </label>
                <input
                  type="url"
                  value={formData.tvtFeedUrl || ''}
                  onChange={(e) => onFieldChange('tvtFeedUrl', e.target.value || undefined)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.tvtFeedUrl && touched.tvtFeedUrl ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="https://..."
                />
                {errors.tvtFeedUrl && touched.tvtFeedUrl && (
                  <p className="text-red-500 text-xs mt-1">{errors.tvtFeedUrl}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Geometría GeoJSON (Opcional)
                </label>
                <textarea
                  value={formData.geometry ? JSON.stringify(formData.geometry, null, 2) : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    onFieldChange('geometry', value);
                  }}
                  placeholder='{"type": "Polygon", "coordinates": [[[lng1, lat1], [lng2, lat2], ...]]}'
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-xs ${
                    errors.geometry && touched.geometry ? 'border-red-500' : 'border-gray-300'
                  }`}
                  rows={6}
                />
                <div className="mt-1">
                  {errors.geometry && touched.geometry ? (
                    <p className="text-red-500 text-xs">{errors.geometry}</p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Al ingresar geometría GeoJSON válida, las coordenadas del centro se calculan automáticamente
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Latitud Centro {formData.geometry ? '(Calculada)' : ''}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.coordinates?.lat?.toFixed(4) || ''}
                  onChange={(e) => onFieldChange('coordinates', {
                    lat: parseFloat(e.target.value) || 0,
                    lon: formData.coordinates?.lon || 0
                  })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formData.geometry ? 'bg-gray-50 cursor-not-allowed' : (errors.coordinates && touched.coordinates ? 'border-red-500' : 'border-gray-300')
                  }`}
                  readOnly={!!formData.geometry}
                  min="-90"
                  max="90"
                />
                {errors.coordinates && touched.coordinates && !formData.geometry && (
                  <p className="text-red-500 text-xs mt-1">{errors.coordinates}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Longitud Centro {formData.geometry ? '(Calculada)' : ''}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.coordinates?.lon?.toFixed(4) || ''}
                  onChange={(e) => onFieldChange('coordinates', {
                    lat: formData.coordinates?.lat || 0,
                    lon: parseFloat(e.target.value) || 0
                  })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    formData.geometry ? 'bg-gray-50 cursor-not-allowed' : (errors.coordinates && touched.coordinates ? 'border-red-500' : 'border-gray-300')
                  }`}
                  readOnly={!!formData.geometry}
                  min="-180"
                  max="180"
                />
                {errors.coordinates && touched.coordinates && !formData.geometry && (
                  <p className="text-red-500 text-xs mt-1">{errors.coordinates}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={Object.keys(errors).some(key => errors[key] !== '')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {polygon ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
          <span className="ml-3 text-gray-600">Cargando polígonos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Gestión de Polígonos</h2>
          <p className="text-sm text-gray-600 mt-1">
            Administra los feeds de Waze asociados a cada polígono
          </p>
        </div>
        <button
          onClick={handleNew}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Polígono
        </button>
      </div>

      <div className="border rounded-xl overflow-hidden shadow-sm bg-white">
        {/* Header - Grid Layout */}
        <div className="grid grid-cols-[80px_minmax(150px,2fr)_minmax(120px,1.5fr)_minmax(150px,2fr)_120px_120px_100px] bg-gray-50 border-b divide-x divide-gray-200 text-sm font-semibold text-gray-900">
          <div className="px-4 py-3">ID</div>
          <div className="px-4 py-3">Nombre</div>
          <div className="px-4 py-3">Grupo</div>
          <div className="px-4 py-3">Feed URL</div>
          <div className="px-4 py-3">Centro</div>
          <div className="px-4 py-3">Geometría</div>
          <div className="px-4 py-3 text-center">Acciones</div>
        </div>

        {/* Virtualized Body */}
        <div className="h-[600px]">
        <VirtualizedList
          items={polygons}
          estimateSize={80} // Altura estimada de fila
          renderItem={(polygon) => (
            <div className="grid grid-cols-[80px_minmax(150px,2fr)_minmax(120px,1.5fr)_minmax(150px,2fr)_120px_120px_100px] divide-x divide-gray-100 border-b border-gray-100 hover:bg-gray-50 transition-colors items-center text-sm">
              <div className="px-4 py-3 font-mono text-xs text-gray-900">{polygon.id}</div>
              <div className="px-4 py-3 font-medium text-gray-900 truncate">{polygon.name}</div>
              <div className="px-4 py-3 text-gray-600 truncate">{polygon.group || '-'}</div>
              <div className="px-4 py-3">
                 <TruncatedText
                    text={polygon.feedUrl}
                    maxLength={40}
                    showCopyButton={true}
                    className="text-xs"
                 />
                 {polygon.tvtFeedUrl && (
                    <div className="mt-1">
                       <TruncatedText
                          text={polygon.tvtFeedUrl}
                          maxLength={40}
                          showCopyButton={true}
                          className="text-xs text-blue-600"
                       />
                    </div>
                 )}
              </div>
              <div className="px-4 py-3 text-xs text-gray-500">
                 {polygon.coordinates ? (
                    <div>
                       <div>{polygon.coordinates.lat.toFixed(4)}</div>
                       <div>{polygon.coordinates.lon.toFixed(4)}</div>
                    </div>
                 ) : (
                    '-'
                 )}
              </div>
              <div className="px-4 py-3 text-xs text-gray-500">
                   {(() => {
                     const geometry = getPolygonGeometry(polygon.id);
                     if (geometry) {
                       const coordsCount = geometry.coordinates[0]?.length || 0;
                       return (
                         <div className="space-y-1">
                           <div className="text-green-600 font-medium">
                             ✅ GeoJSON
                           </div>
                           <div className="text-gray-600">
                             {coordsCount} ptos
                           </div>
                           <button
                             onClick={() => {
                               setSelectedGeoJson({
                                 polygon: polygon,
                                 geometry: geometry
                               });
                               setShowGeoJsonModal(true);
                             }}
                             className="text-blue-600 hover:text-blue-800 text-[10px] underline"
                             title="Ver geometría GeoJSON completa"
                           >
                             Ver
                           </button>
                         </div>
                       );
                     } else {
                       return (
                         <div className="space-y-1">
                           <div className="text-orange-600 font-medium">
                             ⚠️ No Geo
                           </div>
                           <div className="text-gray-400 text-[10px]">
                             Centro only
                           </div>
                         </div>
                       );
                     }
                   })()}
              </div>
              <div className="px-4 py-3 flex justify-center">
                   <div className="flex items-center space-x-2">
                     <button
                       onClick={() => handleEdit(polygon)}
                       className="text-blue-600 hover:text-blue-800 p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                       title="Editar"
                     >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                       </svg>
                     </button>
                     <button
                       onClick={() => handleDelete(polygon.id)}
                       className="text-red-600 hover:text-red-800 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                       title="Eliminar"
                     >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                       </svg>
                     </button>
                   </div>
              </div>
            </div>
          )}
        />
        </div>
      </div>

      {polygons.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm">No hay polígonos configurados</p>
          <button
            onClick={handleNew}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Crear primer polígono
          </button>
        </div>
      )}

      {showForm && (
        <PolygonForm
          polygon={editingPolygon}
          formData={editingPolygon || {
            id: '',
            name: '',
            feedUrl: '',
            tvtFeedUrl: '',
            group: '',
            coordinates: { lat: 0, lon: 0 }
          }}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingPolygon(null);
          }}
          errors={errors}
          touched={touched}
          onFieldChange={(field, value) => {
            const newFormData = editingPolygon ? { ...editingPolygon, [field]: value } : {
              id: '',
              name: '',
              feedUrl: '',
              tvtFeedUrl: '',
              group: '',
              coordinates: { lat: 0, lon: 0 },
              [field]: value
            };
            if (editingPolygon) {
              setEditingPolygon(newFormData);
            }
            const error = validateField(field, value);
            setErrors(prev => ({ ...prev, [field]: error }));
            setTouched(prev => ({ ...prev, [field]: true }));
          }}
          onValidateForm={validateForm}
          polygons={polygons}
        />
      )}

      {/* Modal para mostrar GeoJSON */}
      {showGeoJsonModal && selectedGeoJson && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowGeoJsonModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">
                    Geometría GeoJSON - {selectedGeoJson.polygon.name}
                  </h2>
                  <p className="text-green-100 text-sm mt-1">
                    ID: {selectedGeoJson.polygon.id} • {selectedGeoJson.geometry.coordinates[0]?.length || 0} coordenadas
                  </p>
                </div>
                <button
                  onClick={() => setShowGeoJsonModal(false)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
                  {JSON.stringify(selectedGeoJson.geometry, null, 2)}
                </pre>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedGeoJson.geometry, null, 2));
                    alert('GeoJSON copiado al portapapeles');
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors mr-2"
                >
                  Copiar GeoJSON
                </button>
                <button
                  onClick={() => setShowGeoJsonModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default PolygonManagement;
