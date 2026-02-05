import React from "react";
import {
  IncidentsFilters,
  translateIncidentType,
  translateIncidentSubtype,
} from "@/hooks/useIncidentsModule";
import { Search, Filter, X, Calendar } from "lucide-react";

interface IncidentFiltersProps {
  filters: IncidentsFilters;
  types: string[];
  subtypesByType: Record<string, string[]>;
  onFilterChange: (filters: Partial<IncidentsFilters>) => void;
  onClearFilters: () => void;
  isLoading?: boolean;
}

export const IncidentFilters: React.FC<IncidentFiltersProps> = ({
  filters,
  types,
  subtypesByType,
  onFilterChange,
  onClearFilters,
  isLoading,
}) => {
  const availableSubtypes = filters.type
    ? subtypesByType[filters.type] || []
    : [];

  const hasActiveFilters = Object.values(filters).some(
    (v) => v !== undefined && v !== "",
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-gray-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Filtros</h3>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="ml-auto text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Limpiar
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {/* Búsqueda */}
        <div className="lg:col-span-2">
          <label
            htmlFor="search-input"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Buscar
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="search-input"
              type="text"
              placeholder="Calle, ciudad o descripción..."
              value={filters.search || ""}
              onChange={(e) =>
                onFilterChange({ search: e.target.value || undefined })
              }
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tipo */}
        <div>
          <label
            htmlFor="type-select"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Tipo
          </label>
          <select
            id="type-select"
            value={filters.type || ""}
            onChange={(e) =>
              onFilterChange({
                type: e.target.value || undefined,
                subtype: undefined, // Reset subtipo al cambiar tipo
              })
            }
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {translateIncidentType(type)}
              </option>
            ))}
          </select>
        </div>

        {/* Subtipo */}
        <div>
          <label
            htmlFor="subtype-select"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Subtipo
          </label>
          <select
            id="subtype-select"
            value={filters.subtype || ""}
            onChange={(e) =>
              onFilterChange({ subtype: e.target.value || undefined })
            }
            disabled={isLoading || !filters.type}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">Todos</option>
            {availableSubtypes.map((subtype) => (
              <option key={subtype} value={subtype}>
                {translateIncidentSubtype(subtype)}
              </option>
            ))}
          </select>
        </div>

        {/* Fecha desde */}
        <div>
          <label
            htmlFor="date-from"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Desde
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="date-from"
              type="date"
              value={filters.from?.split("T")[0] || ""}
              onChange={(e) =>
                onFilterChange({
                  from: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : undefined,
                })
              }
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Fecha hasta */}
        <div>
          <label
            htmlFor="date-to"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Hasta
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="date-to"
              type="date"
              value={filters.to?.split("T")[0] || ""}
              onChange={(e) =>
                onFilterChange({
                  to: e.target.value
                    ? new Date(e.target.value + "T23:59:59").toISOString()
                    : undefined,
                })
              }
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Estado */}
        <div>
          <label
            htmlFor="status-select"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Estado
          </label>
          <select
            id="status-select"
            value={
              filters.isActive === undefined ? "" : String(filters.isActive)
            }
            onChange={(e) =>
              onFilterChange({
                isActive:
                  e.target.value === "" ? undefined : e.target.value === "true",
              })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>
      </div>
    </div>
  );
};
