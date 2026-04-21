import React, { useEffect } from "react";
import { useIncidenteOficialStore } from "../stores/useIncidenteOficialStore";
import { CheckCircle, XCircle, FileText, AlertTriangle, MapPin, Loader2 } from "lucide-react";
import { useAuthStore } from "../stores/useAuthStore";
import { IncidenteOficial } from "../services/incidenteOficialService";

export const InboxOperativoPage: React.FC = () => {
  const { incidentes, isLoading, error, fetchIncidentes, aprobarIncidente, rechazarIncidente } = useIncidenteOficialStore();
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    fetchIncidentes();
    // Podría haber un pooling (setInterval) o websocket aquí.
  }, []);

  const pendientes = incidentes.filter(i => i.estado_workflow === 'Enviado_A_Base');
  const enCurso = incidentes.filter(i => i.estado_workflow === 'Validado_Base');

  const handleAprobar = async (id: number) => {
    if (confirm("¿Estás seguro de que deseas VALIDAR este incidente y subirlo al Libro Oficial? Esto silenciará las alertas Waze de esta zona.")) {
      await aprobarIncidente(id);
    }
  };

  const handleRechazar = async (id: number) => {
    const r = prompt("Motivo del rechazo (Falta info, Patente incorrecta, etc):");
    if (r) {
      await rechazarIncidente(id, r);
    }
  };

  const RenderCard = ({ incidente, showActions = false }: { incidente: IncidenteOficial, showActions?: boolean }) => (
    <div key={incidente.id} className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border-l-4 border-l-amber-500 mb-4 transition-colors">
      <div className="flex justify-between">
        <h3 className="font-bold flex items-center gap-2 text-gray-800 dark:text-white">
          <AlertTriangle className={`w-5 h-5 ${incidente.gravedad === 4 ? 'text-black' : incidente.hay_lesionados ? 'text-red-500' : 'text-amber-500'}`} />
          Siniestro / Cód {incidente.codigo_situacion || "S/D"}
        </h3>
        <span className="text-xs text-gray-500">{new Date(incidente.created_at).toLocaleString()}</span>
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <MapPin className="text-blue-500 w-4 h-4" />
          <span className="text-gray-700 dark:text-gray-300">Ruta: {incidente.ruta || "S/D"} - KM: {incidente.kilometro || "S/D"}</span>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="text-purple-500 w-4 h-4" />
          <span className="text-gray-700 dark:text-gray-300">Inspect. ID: {incidente.creador_id}</span>
        </div>
      </div>

      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1">OBSERVACIONES DEL TERRENO:</p>
        <p className="text-sm text-gray-700 dark:text-gray-300">{incidente.observaciones || "Sin observaciones escritas."}</p>
        <div className="flex gap-2 mt-2">
          {incidente.hay_lesionados && <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold font-mono">CON LESIONADOS</span>}
          {incidente.hay_obitos && <span className="px-2 py-1 bg-black text-white rounded text-xs font-bold font-mono">OBITOS DETECTADOS</span>}
        </div>
      </div>

      {showActions && (
        <div className="mt-4 flex gap-3 border-t border-gray-100 dark:border-gray-700 pt-4">
          <button onClick={() => handleAprobar(incidente.id)} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg flex justify-center items-center gap-2 transition-colors">
            <CheckCircle className="w-5 h-5" /> Validar y Silenciar Waze
          </button>
          <button onClick={() => handleRechazar(incidente.id)} className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg flex justify-center items-center transition-colors">
            <XCircle className="w-5 h-5" /> Devolver
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col space-y-6 container mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bandeja Operativa (Libro de Actas)</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Revisión de Novedades enviadas desde la App Móvil
          </p>
        </div>
        <button onClick={() => fetchIncidentes()} className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
          Actualizar 🔄
        </button>
      </div>

      {isLoading && <div className="text-center p-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" /></div>}
      {error && <div className="bg-red-100 text-red-700 p-4 rounded-xl">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Columna 1: Borradores por Validar */}
        <div className="flex flex-col h-full bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/30 p-4">
          <h2 className="text-lg font-bold text-orange-800 dark:text-orange-400 mb-4 flex items-center justify-between">
            📥 Pendientes de Revisión (Recién llegados)
            <span className="bg-orange-200 dark:bg-orange-800 text-orange-900 dark:text-orange-200 px-2 py-1 rounded text-sm">{pendientes.length}</span>
          </h2>
          <div className="overflow-y-auto flex-1 pr-2">
            {pendientes.length === 0 && <p className="text-gray-400 italic text-center mt-10">Bandeja vacía.</p>}
            {pendientes.map(inc => <RenderCard key={inc.id} incidente={inc} showActions={true} />)}
          </div>
        </div>

        {/* Columna 2: Activos / Validados */}
        <div className="flex flex-col h-full bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-900/30 p-4">
          <h2 className="text-lg font-bold text-green-800 dark:text-green-400 mb-4 flex items-center justify-between">
            ✅ Libro Oficial (Validados en Curso)
            <span className="bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-200 px-2 py-1 rounded text-sm">{enCurso.length}</span>
          </h2>
          <div className="overflow-y-auto flex-1 pr-2">
            {enCurso.length === 0 && <p className="text-gray-400 italic text-center mt-10">Sin incidentes oficiales en curso.</p>}
            {enCurso.map(inc => <RenderCard key={inc.id} incidente={inc} showActions={false} />)}
          </div>
        </div>
      </div>
    </div>
  );
};
