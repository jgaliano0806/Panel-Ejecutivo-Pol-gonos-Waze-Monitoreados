import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { IncidentImpactCard } from "./IncidentImpactCard";
import {
  AlertCircle,
  Drill,
  Siren,
  RefreshCcw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { API_CONFIG } from "../../config/constants";

interface OperationalData {
  topCriticalIncidents: any[];
  operationalAlerts: any[];
  potholeClusters: any[];
  feedStats: {
    lastUpdate: string;
    totalActiveEvents: number;
    polygonsCovered: number;
  };
}

const fetchAnalytics = async () => {
  const url = `${API_CONFIG.baseUrl}/analytics/realtime`;
  const { data } = await axios.get(url);
  return data;
};

export const OperationalAnalyticsDashboard: React.FC = () => {
  const { data, isLoading, isError, refetch } = useQuery<OperationalData>({
    queryKey: ["operational-analytics"],
    queryFn: fetchAnalytics,
    refetchInterval: 30000, // 30 segundos
  });

  if (isLoading)
    return (
      <div className="p-8 text-center animate-pulse">
        Cargando Análisis Operativo...
      </div>
    );
  if (isError || !data)
    return (
      <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg flex flex-col items-center">
        <WifiOff className="w-12 h-12 mb-2" />
        <h3 className="font-bold text-lg">
          Error de Conexión con el Servicio de Analítica
        </h3>
        <p className="mb-4">
          No se pudo conectar con el motor de análisis experto.
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-red-100 rounded hover:bg-red-200"
        >
          Reintentar
        </button>
      </div>
    );

  return (
    <div className="space-y-6">
      {/* 1. Header & Stats Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-veltrix-card p-4 rounded-lg shadow-sm border border-gray-100 dark:border-veltrix-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
            <Siren className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold dark:text-white">
              Centro de Control Operativo
            </h2>
            <p className="text-sm text-gray-500">
              Monitoreo Inteligente de Waze v2.0
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <div className="text-right">
            <p className="text-xs text-gray-400">Última Actualización</p>
            <p className="font-mono font-bold dark:text-veltrix-text">
              {new Date(data.feedStats.lastUpdate).toLocaleTimeString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="flex gap-1 items-center">
              <Wifi className="w-3 h-3 text-green-500" />
              {data.feedStats.totalActiveEvents} Eventos
            </Badge>
            <button
              onClick={() => refetch()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <RefreshCcw className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Operational Alerts (Action Center) */}
      {data.operationalAlerts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            Alertas de Acción Inmediata
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {data.operationalAlerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in slide-in-from-top-2"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-red-600 hover:bg-red-700 text-white border-none">
                      CRÍTICO
                    </Badge>
                    <span className="font-bold text-red-900 dark:text-red-100">
                      {alert.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-gray-800 dark:text-gray-200 font-medium">
                    {alert.message}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {alert.location}
                  </p>
                </div>
                <div className="bg-white dark:bg-veltrix-bg p-3 rounded shadow-sm border border-red-100 dark:border-none min-w-[300px]">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">
                    Recomendación del Experto
                  </p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-veltrix-text">
                    {alert.recommendation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Top Critical Incidents */}
      <div>
        <h3 className="text-lg font-semibold mb-4 dark:text-veltrix-text">
          Top 5 Incidentes Prioritarios (Score Waze-Expert)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {data.topCriticalIncidents.length === 0 ? (
            <div className="col-span-full text-center py-10 text-gray-400 bg-gray-50 dark:bg-veltrix-card rounded-lg border-dashed border-2 dark:border-veltrix-border">
              Sin incidentes críticos detectados en este momento.
            </div>
          ) : (
            data.topCriticalIncidents.map((inc) => (
              <IncidentImpactCard key={inc.uuid} data={inc} />
            ))
          )}
        </div>
      </div>

      {/* 4. Infrastructure Planning (Potholes) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-white dark:bg-veltrix-card dark:border-veltrix-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-veltrix-text">
              <Drill className="w-5 h-5 text-orange-500" />
              Planificación de Bacheo (Clusters)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-veltrix-bg text-gray-500 dark:text-veltrix-muted">
                  <tr>
                    <th className="p-3">Calle / Zona</th>
                    <th className="p-3">Ciudad</th>
                    <th className="p-3 text-center">Cant. Reportes</th>
                    <th className="p-3 text-center">Confianza Prom.</th>
                    <th className="p-3 text-right">Acción Sugerida</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.potholeClusters.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-gray-400">
                        No hay zonas de bacheo críticas identificadas.
                      </td>
                    </tr>
                  ) : (
                    data.potholeClusters.map((cluster, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-gray-50 dark:hover:bg-veltrix-bg transition-colors"
                      >
                        <td className="p-3 font-medium dark:text-veltrix-text">
                          {cluster.street}
                        </td>
                        <td className="p-3 text-gray-500 dark:text-veltrix-muted">
                          {cluster.city}
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant="secondary">{cluster.count}</Badge>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500"
                                style={{
                                  width: `${cluster.avgConfidence * 10}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs">
                              {cluster.avgConfidence}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          {cluster.count >= 5 ? (
                            <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded">
                              Prioridad Alta
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                              Programar
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-veltrix-card dark:border-veltrix-border">
          <CardHeader>
            <CardTitle className="text-base dark:text-veltrix-text">
              Métricas de Cobertura
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900">
              <p className="text-sm text-gray-600 dark:text-veltrix-muted">
                Polígonos Activos
              </p>
              <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                {data.feedStats.polygonsCovered}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900">
              <p className="text-sm text-gray-600 dark:text-veltrix-muted">
                Salud del Feed
              </p>
              <p className="text-lg font-bold text-green-700 dark:text-green-300">
                100% Operativo
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Actualización cada 2 min
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
