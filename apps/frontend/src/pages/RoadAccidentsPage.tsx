import React, { useState } from 'react';
import {
    Car,
    Cloud,
    Thermometer,
    Wind,
    Eye,
    Droplets,
    Clock,
    MapPin,
    Upload,
    Image as ImageIcon,
    Film,
    Plus,
    X,
    MessageSquare,
    AlertTriangle,
    Navigation2
} from 'lucide-react';
import { useRoadAccidents, useRoadAccident, useUploadAccidentMedia } from '../hooks/useRoadAccidents';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Helper to update map center
const RecenterMap = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    map.setView(center);
    return null;
};

export const RoadAccidentsPage: React.FC = () => {
    const [selectedAccidentId, setSelectedAccidentId] = useState<string | null>(null);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);

    const { data: accidents, isLoading: listLoading } = useRoadAccidents();
    const { data: accident, isLoading: detailsLoading } = useRoadAccident(selectedAccidentId);

    const uploadMediaMutation = useUploadAccidentMedia();

    const handleUpload = async () => {
        if (!selectedAccidentId || !uploadFiles) return;

        try {
            await uploadMediaMutation.mutateAsync({ id: selectedAccidentId, files: uploadFiles });
            setIsUploadOpen(false);
            setUploadFiles(null);
        } catch (error) {
            console.error('Error uploading media:', error);
            alert('Error al subir los archivos');
        }
    };

    const getSeverityColor = (severity?: number) => {
        if (!severity) return 'bg-gray-400';
        if (severity >= 4) return 'bg-red-600';
        if (severity === 3) return 'bg-orange-500';
        if (severity === 2) return 'bg-yellow-500';
        return 'bg-blue-500';
    };

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    return (
        <div className="flex min-h-[calc(100vh-200px)] bg-gray-50 overflow-hidden">
            {/* Sidebar: Lista de Accidentes */}
            <div className="w-96 border-r border-gray-200 bg-white flex flex-col h-full">
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Car className="w-6 h-6 text-red-600" />
                            Siniestros Viales
                        </h1>
                        <button className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors">
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-sm text-gray-500">Gestión de siniestros y respaldo multimedia</p>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {listLoading ? (
                        <div className="p-8 text-center text-gray-400 italic">Cargando siniestros...</div>
                    ) : accidents && accidents.length > 0 ? (
                        accidents.map((acc) => (
                            <div
                                key={acc.id}
                                onClick={() => setSelectedAccidentId(acc.id)}
                                className={`p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${selectedAccidentId === acc.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase ${getSeverityColor(acc.severity)}`}>
                                        {acc.subtype || acc.type}
                                    </span>
                                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(acc.accident_at).toLocaleString()}
                                    </span>
                                </div>
                                <h3 className="font-semibold text-gray-800 text-sm truncate">{acc.street || 'Ubicación desconocida'}</h3>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="flex -space-x-1">
                                        {acc.media?.length > 0 ? (
                                            acc.media.slice(0, 3).map((m, i) => (
                                                <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center overflow-hidden">
                                                    {m.file_type === 'image' ? <ImageIcon className="w-3 h-3 text-gray-500" /> : <Film className="w-3 h-3 text-gray-500" />}
                                                </div>
                                            ))
                                        ) : (
                                            <span className="text-[10px] text-gray-400 italic">Sin archivos</span>
                                        )}
                                    </div>
                                    {acc.media?.length > 0 && (
                                        <span className="text-[10px] text-gray-500">+{acc.media.length} archivos</span>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-gray-400 italic">No hay siniestros registrados.</div>
                    )}
                </div>
            </div>

            {/* Content: Detalle y Mapa */}
            <div className="flex-1 flex flex-col h-full overflow-y-auto">
                {selectedAccidentId ? (
                    detailsLoading ? (
                        <div className="m-auto text-gray-400">Cargando detalles...</div>
                    ) : accident ? (
                        <div className="p-6 space-y-6">
                            {/* Header Detalle */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-3xl font-bold text-gray-800">{accident.street || 'Calle Desconocida'}</h2>
                                        <span className={`px-3 py-1 rounded-full text-sm font-bold text-white ${getSeverityColor(accident.severity)}`}>
                                            Nivel {accident.severity || '?'}
                                        </span>
                                    </div>
                                    <p className="flex items-center gap-2 text-gray-500">
                                        <MapPin className="w-4 h-4" />
                                        Coordenadas: {accident.location_lat.toFixed(5)}, {accident.location_lng.toFixed(5)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsUploadOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-all active:scale-95"
                                >
                                    <Upload className="w-4 h-4" />
                                    Subir Respaldo
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Minimapa */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-[350px]">
                                    <MapContainer
                                        center={[accident.location_lat, accident.location_lng]}
                                        zoom={15}
                                        style={{ height: '100%', width: '100%' }}
                                    >
                                        <RecenterMap center={[accident.location_lat, accident.location_lng]} />
                                        <TileLayer
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            attribution='&copy; OpenStreetMap contributors'
                                        />
                                        <Marker position={[accident.location_lat, accident.location_lng]}>
                                            <Popup>
                                                <div className="font-bold">{accident.street}</div>
                                                <div className="text-xs">{accident.subtype || accident.type}</div>
                                            </Popup>
                                        </Marker>
                                    </MapContainer>
                                </div>

                                {/* Información Climática */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <Cloud className="w-5 h-5 text-blue-500" />
                                        Condiciones Climáticas al Momento
                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                            AccuWeather
                                        </span>
                                    </h3>

                                    {accident.weather_data && Object.keys(accident.weather_data).length > 0 ? (
                                        <div className="grid grid-cols-2 gap-6 flex-1">
                                            <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-xl">
                                                <Thermometer className="w-8 h-8 text-orange-500" />
                                                <div>
                                                    <p className="text-xs text-orange-600 font-medium">Temperatura</p>
                                                    <p className="text-2xl font-bold text-orange-800">{accident.weather_data.temperature_celsius}°C</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl">
                                                <Droplets className="w-8 h-8 text-blue-500" />
                                                <div>
                                                    <p className="text-xs text-blue-600 font-medium">Precipitación</p>
                                                    <p className="text-2xl font-bold text-blue-800">{accident.weather_data.precipitation_mm}mm</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                                <Wind className="w-8 h-8 text-gray-500" />
                                                <div>
                                                    <p className="text-xs text-gray-500 font-medium">Viento</p>
                                                    <p className="text-xl font-bold text-gray-700">{accident.weather_data.wind_speed_kmh} km/h</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl">
                                                <Eye className="w-8 h-8 text-purple-500" />
                                                <div>
                                                    <p className="text-xs text-purple-600 font-medium">Visibilidad</p>
                                                    <p className="text-xl font-bold text-purple-700">{accident.weather_data.visibility_meters / 1000} km</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center text-gray-400 italic">
                                            No hay datos climáticos vinculados.
                                        </div>
                                    )}

                                    <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 flex items-start gap-2 italic">
                                        <Navigation2 className="w-4 h-4 mt-0.5 text-gray-400" />
                                        {accident.weather_data?.weather_description || 'Condición estable'}
                                    </div>
                                </div>
                            </div>

                            {/* Notas y Waze Data */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <MessageSquare className="w-5 h-5 text-green-500" />
                                        Notas del Operador
                                    </h3>
                                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl min-h-[100px] text-gray-700">
                                        {accident.operator_notes || 'Sin notas adicionales para este siniestro.'}
                                    </div>
                                </div>
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                                        Información Waze
                                    </h3>
                                    <div className="text-sm space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">ID Incidente:</span>
                                            <span className="font-mono text-xs">{accident.incident_id || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Confiabilidad:</span>
                                            <span className="font-medium text-blue-600">{accident.waze_data?.reliability || 'N/A'}/10</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Votos POS/NEG:</span>
                                            <span className="font-medium">{accident.waze_data?.nThumbsUp || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Galería Multimedia */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    <ImageIcon className="w-5 h-5 text-indigo-500" />
                                    Respaldo Multimedia ({accident.media?.length || 0})
                                </h3>

                                {accident.media && accident.media.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {accident.media.map((item, idx) => (
                                            <div key={idx} className="group relative rounded-xl overflow-hidden bg-black border border-gray-200 aspect-video shadow-sm">
                                                {item.file_type === 'image' ? (
                                                    <img
                                                        src={`${API_URL}${item.file_path}`}
                                                        alt={item.original_name}
                                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                    />
                                                ) : (
                                                    <video
                                                        src={`${API_URL}${item.file_path}`}
                                                        className="w-full h-full object-cover"
                                                        controls
                                                    />
                                                )}
                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 p-2 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity flex justify-between">
                                                    <span className="truncate">{item.original_name}</span>
                                                    <span>{Math.round((item.file_size_bytes || 0) / 1024)} KB</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
                                        <Upload className="w-12 h-12 mb-3 stroke-1" />
                                        <p>No hay archivos multimedia cargados para este siniestro.</p>
                                        <button
                                            onClick={() => setIsUploadOpen(true)}
                                            className="mt-4 text-blue-600 font-medium hover:underline"
                                        >
                                            Haga clic aquí para subir el primero
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null
                ) : (
                    <div className="m-auto flex flex-col items-center text-gray-300">
                        <Car className="w-24 h-24 mb-4 stroke-1" />
                        <p className="text-xl font-medium">Seleccione un siniestro para ver el detalle</p>
                    </div>
                )}
            </div>

            {/* Modal: Upload */}
            {isUploadOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-800">Subir Archivos</h3>
                            <button onClick={() => setIsUploadOpen(false)} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                                <X className="w-6 h-6 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-8">
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Seleccione imágenes o videos del siniestro</label>
                                <div
                                    className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                                    onClick={() => document.getElementById('file-upload')?.click()}
                                >
                                    <Upload className="w-12 h-12 text-gray-400 mb-3" />
                                    <p className="text-sm text-gray-600 font-medium">
                                        {uploadFiles ? `${uploadFiles.length} archivos seleccionados` : 'Arrastre archivos aquí o haga clic'}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">Imágenes (JPG, PNG) o Videos (MP4)</p>
                                    <input
                                        type="file"
                                        id="file-upload"
                                        className="hidden"
                                        multiple
                                        accept="image/*,video/*"
                                        onChange={(e) => setUploadFiles(e.target.files)}
                                    />
                                </div>
                            </div>

                            {uploadFiles && (
                                <div className="mb-6 space-y-2 max-h-40 overflow-y-auto">
                                    {Array.from(uploadFiles).map((f, i) => (
                                        <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg text-xs">
                                            <div className="flex items-center gap-2">
                                                {f.type.startsWith('video/') ? <Film className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                                                <span className="truncate max-w-[200px]">{f.name}</span>
                                            </div>
                                            <span className="text-gray-400">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                disabled={!uploadFiles || uploadMediaMutation.isPending}
                                onClick={handleUpload}
                                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:shadow-none transition-all active:scale-[0.98]"
                            >
                                {uploadMediaMutation.isPending ? 'Subiendo...' : 'Iniciar Carga'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
