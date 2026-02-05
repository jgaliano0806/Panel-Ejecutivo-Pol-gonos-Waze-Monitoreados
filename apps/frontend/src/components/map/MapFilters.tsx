import React from "react";

export interface MapFiltersState {
  showPolygons: boolean;
  showIncidents: boolean;
  showJams: boolean;
}

interface MapFiltersProps {
  filters: MapFiltersState;
  onFiltersChange: (filters: MapFiltersState) => void;
}

const MapFilters: React.FC<MapFiltersProps> = ({
  filters,
  onFiltersChange,
}) => {
  const handleToggle = (key: keyof MapFiltersState) => {
    onFiltersChange({
      ...filters,
      [key]: !filters[key],
    });
  };

  return (
    <div className="absolute top-4 right-4 z-[1000] bg-white rounded-xl shadow-2xl border-3 border-gray-800 p-4 min-w-[280px]">
      <h3 className="text-sm font-black uppercase tracking-wide text-gray-700 mb-3 flex items-center gap-2">
        <span className="text-lg">🔍</span>
        Filtros del Mapa
      </h3>

      <div className="space-y-3">
        {/* Filtro de Polígonos */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border-2 border-blue-500 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🗺️</span>
            <div>
              <p className="text-sm font-bold text-gray-900">Polígonos</p>
              <p className="text-xs text-gray-600">Áreas monitoreadas</p>
            </div>
          </div>
          <button
            onClick={() => handleToggle("showPolygons")}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
              filters.showPolygons ? "bg-green-500" : "bg-gray-300"
            }`}
            aria-label="Toggle polygons"
            title="Mostrar/Ocultar Polígonos"
          >
            <div
              className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${
                filters.showPolygons ? "transform translate-x-7" : ""
              }`}
            />
          </button>
        </div>

        {/* Filtro de Incidentes */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-red-50 to-red-100 rounded-lg border-2 border-red-500 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm font-bold text-gray-900">Incidentes</p>
              <p className="text-xs text-gray-600">Alertas y eventos</p>
            </div>
          </div>
          <button
            onClick={() => handleToggle("showIncidents")}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
              filters.showIncidents ? "bg-green-500" : "bg-gray-300"
            }`}
            aria-label="Toggle incidents"
            title="Mostrar/Ocultar Incidentes"
          >
            <div
              className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${
                filters.showIncidents ? "transform translate-x-7" : ""
              }`}
            />
          </button>
        </div>

        {/* Filtro de Tráfico */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border-2 border-orange-500 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚦</span>
            <div>
              <p className="text-sm font-bold text-gray-900">Tráfico</p>
              <p className="text-xs text-gray-600">Congestión vial</p>
            </div>
          </div>
          <button
            onClick={() => handleToggle("showJams")}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
              filters.showJams ? "bg-green-500" : "bg-gray-300"
            }`}
            aria-label="Toggle traffic jams"
            title="Mostrar/Ocultar Tráfico"
          >
            <div
              className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${
                filters.showJams ? "transform translate-x-7" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Contador de elementos visibles */}
      <div className="mt-4 pt-3 border-t-2 border-gray-200">
        <p className="text-xs text-gray-600 text-center font-medium">
          {
            [
              filters.showPolygons,
              filters.showIncidents,
              filters.showJams,
            ].filter(Boolean).length
          }{" "}
          de 3 capas visibles
        </p>
      </div>
    </div>
  );
};

export default MapFilters;
